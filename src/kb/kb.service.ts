import { Injectable } from '@nestjs/common';
import { CreateKbDto } from './dto/create-kb.dto';
import { UpdateKbDto } from './dto/update-kb.dto';
import { BusinessException } from '../common/exceptions/businessException';
import * as XLSX from 'xlsx';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { type Response } from 'express';
import 'multer';
import { AiService } from '../ai/ai.service';
import { getPromptCombination } from '../common/utils/getPrompt';

@Injectable()
export class KbService {
  private openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {
    // 初始化大模型客户端
    this.openai = new OpenAI({
      apiKey:
        'sk-ws-H.YLDERIH.ekfL.MEQCIEAgb5I0feWsIwl7eJ6AIeeyK3ch-NHvZLXN-uf7nVl4AiAEsbMR7D0nwhYd-SBoPwrn3UrsTt1Hd1UUctN_dSpIDA',
      baseURL: 'https://ws-j6au82yqad2nhr89.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
    });
  }

  async chat(query: string, res: Response) {
    const matchedPlans = await this.searchEnrollmentPlans(query);
    if (!matchedPlans || matchedPlans.length === 0) {
      // 没有匹配到资料时，同样要用 SSE 格式写回并结束响应，不能只 return（@Res() 模式下 Nest 不会自动发送返回值）
      const text = '抱歉，在当前的官方招生计划库中没有找到与之相关的专业或院校信息，请换个问题再试。';
      res.status(200); // 提前设置，避免 POST 默认 201 被前端判为失败
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
      res.end();
      return;
    }
    // 2. 将检索出来的多条官方数据拼接成一段给大模型的“背景参考资料”
    const context = matchedPlans.map((plan, index) => `[资料${index + 1}]: ${getPromptCombination(plan)}`).join('\n');

    // 3. 构建高强度的系统 Prompt（人设注入），死死锁住大模型，防止它胡编乱造
    const systemPrompt = `你是一个专业、温柔、严谨的【江苏省专转本智能招生咨询机器人】。
                          你的任务是根据给定的【官方参考资料】来回答用户的提问。
                          【严格行为准则】：
                          1. 只能基于给定的【官方参考资料】进行回答。
                          2. 如果资料中没有提及相关信息，请直接礼貌回答“抱歉，官方资料中暂未收录该数据”，绝对不能凭借个人常识瞎编乱造（严禁幻觉）。
                          3. 回答语调要清晰、条理分明，涉及学费、计划数等数字时必须与资料完全一致。
                          4. 回答中不能包含个人意见、个人经验、个人偏见等，只能基于资料回答。
                          5. 回答不要重复性说相似的话。
                          6. 当需要列举多所院校的招生计划时，必须使用标准的 Markdown 表格格式（即使用 | 分隔符）进行输出。
                          【语言温度要求】
                          1.回答完招生计划后，可以根据专业大类（如电子信息类/计算机类）顺口提醒一下用户该大类大概需要考哪些科目，或者祝考生备考顺利，拉近与学生的距离。” `;
    const userPrompt = `【官方参考资料】：
                          ${context}
                          【用户的提问】：
                          "${query}"
                        请结合上述参考资料，给出最专业、详细的解答。`;
    try {
      return this.aiService.getPrompt(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        res,
      );
    } catch (error) {
      console.error('DeepSeek 响应失败：', error);
      throw new Error('AI 大脑思考失败，请稍后再试');
    }
  }

  async upload(file: Express.Multer.File) {
    if (!file) {
      throw new BusinessException({
        msg: '文件不能为空',
        code: 500,
        httpStatus: 500,
      });
    }
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
    const realDataRows = jsonData.slice(1);
    for (const row of realDataRows) {
      // 提取核心字段（对照你截图里的数据结构）
      const category = row['2026年江苏省普通高校“专转本”录取征求平行志愿计划表：“报考类别”'] || ''; // 财经类
      const targetObject = row['__EMPTY_1'] || ''; // 普通在校生
      const schoolCode = row['__EMPTY_2'] || ''; // 1371
      const schoolName = row['__EMPTY_3'] || ''; // 南京师范大学泰州学院
      const majorCode = row['__EMPTY_4'] || ''; // 01
      const majorName = row['__EMPTY_5'] || ''; // 国际经济与贸易
      const planCount = parseInt(row['__EMPTY_6']) || 0; // 43
      const tuition = row['__EMPTY_7'] || ''; // 19800
      const language = row['__EMPTY_8'] || ''; // 不限
      const requirement = row['__EMPTY_9'] || ''; // 要求
      const remark = row['__EMPTY_10'] || ''; // 备注
      const status = row['__EMPTY_11'] || 1; // 1

      // 组装最核心的语义描述文本，供大模型生成向量使用
      const contentText = `2026年江苏省普通高校专转本招生计划：报考类别为【${category}】，招生对象为【${targetObject}】。
      院校名称为【${schoolName}】（院校代号：${schoolCode}），专业名称为【${majorName}】（专业代号：${majorCode}）
      。计划招生人数为${planCount}人，学费为${tuition}元/年，应试外语语种要求为：${language}，对报考者专科阶段所学专业要求为：${requirement}。`;

      try {
        // 调用大模型接口将这段话转化为 1536 维度的向量
        const embeddingResponse = await this.openai.embeddings.create({
          model: 'qwen3.7-text-embedding', // 推荐使用此模型，原生生成 1536 维向量
          input: contentText,
          dimensions: 1536,
        });
        const vectorArray = embeddingResponse.data[0].embedding; // 拿到 1536 个浮点数组成的数组
        const vectorString = `[${vectorArray.join(',')}]`; // 格式化为 pgvector 识别的字符串格式

        //  执行与Schema 字段完全对应的原生 SQL 插入
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO "enrollment_plans" (
            "category", 
            "schoolCode", 
            "schoolName", 
            "majorCode", 
            "majorName", 
            "planCount", 
            "tuition", 
            "language", 
            "requirement", 
            "remark", 
            "status",
            "embedding",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
            cast($12 as vector),
            now(),
            now()
          )`,
          category, // $1: 报考类别 (如 财经类)
          schoolCode, // $2: 院校代号 (如 1371)
          schoolName, // $3: 院校名称 (如 南京师范大学泰州学院)
          majorCode, // $4: 专业代号 (如 01)
          majorName, // $5: 专业名称 (如 国际经济与贸易)
          planCount || 0, // $6: 计划数 (确保是数字 Int)
          tuition || 0, // $7: 学费 (确保是数字 Int)
          language, // $8: 语种要求
          requirement || null, // $9: 报考要求 (可空字段)
          remark || null, // $10: 备注 (可空字段)
          status || null, // $11: 状态 (可空字段)
          vectorString, // $12: 1536 维向量字符串
        );

        console.log(`成功向量化并入库：${schoolName} - ${majorName}`);
      } catch (error) {
        // 生产环境建议做重试机制或记录错误日志
        console.error(`单条数据处理失败：${schoolName}`, error);
        // 向前端抛出 NestJS 标准异常，当前 HTTP 请求直接被切断并报错
        throw new BusinessException({
          msg: `表格解析中途崩溃`,
          code: 500,
          httpStatus: 500,
        });
      }
    }
  }

  /**
   * 核心方法：根据用户输入的文本进行语义搜索（向量相似度检索）
   * @param queryText 用户提问的文本
   * @param limit 召回最匹配的数据条数
   */
  async searchEnrollmentPlans(query: string, limit = 4): Promise<any[]> {
    if (!query) {
      throw new BusinessException({
        msg: '查询文本不能为空',
        code: 400,
        httpStatus: 400,
      });
    }
    try {
      // 必须使用与入库时【完全相同】的模型，将用户提问转化为 1536 维向量
      const embeddingResponse = await this.openai.embeddings.create({
        model: 'qwen3.7-text-embedding',
        input: query,
        dimensions: 1536,
      });

      const vectorArray = embeddingResponse.data[0].embedding;
      const vectorString = `[${vectorArray.join(',')}]`;

      //  使用 pgvector 专属操作符 <=> 计算余弦距离（距离越小越相似），并进行状态过滤
      // 通过 (embedding <=> $1::vector) AS distance 还能顺便算出相似度得分
      const matchedPlans = (await this.prisma.$queryRawUnsafe(
        `SELECT
          "id",
          "category",
          "schoolCode",
          "schoolName",
          "majorCode",
          "majorName",
          "planCount",
          "tuition",
          "language",
          "requirement",
          "remark",
          (1 - (embedding <=> cast($1 as vector))) AS "similarity"
        FROM "enrollment_plans"
        WHERE "status" = 1 AND (1 - (embedding <=> cast($1 as vector))) > 0.4 
        ORDER BY embedding <=> cast($1 as vector) ASC
        LIMIT $2
      `,
        vectorString,
        limit,
      )) as any[];
      return matchedPlans;
    } catch (error) {
      console.error('AI 检索失败:', error);
      throw new BusinessException({
        msg: 'AI 检索失败',
        code: 500,
        httpStatus: 500,
      });
    }
  }
}
