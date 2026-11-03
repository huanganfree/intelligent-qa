export function getPromptCombination(prompt: any) {
  const {
    category,
    targetObject,
    schoolName,
    schoolCode,
    majorName,
    majorCode,
    planCount,
    tuition,
    language,
    requirement,
  } = prompt;
  let contentText = `2026年江苏省普通高校专转本招生计划：报考类别为【${category}】，招生对象为【${targetObject}】。
      院校名称为【${schoolName}】（院校代号：${schoolCode}），专业名称为【${majorName}】（专业代号：${majorCode}）
      。计划招生人数为${planCount}人，学费为${tuition}元/年，应试外语语种要求为：${language}，对报考者专科阶段所学专业要求为：${requirement}。`;

  //  清洗带有“资料显示为”等测试/日志语气的冗余文本
  contentText = contentText.replace(/资料显示为\s*null\s*\(未明确\)|undefined|''|null|''/g, '官方暂未明确限制');
  contentText = contentText.replace(/资料中暂未收录明确信息/g, '以官方最新公布为准');
  return contentText;
}
