const fs = require('fs');
const path = require('path');

// 定义源路径与目标路径
const rootDir = __dirname;
const releaseDir = path.join(rootDir, 'release');

// 声明除了 dist 外，必须一并带走的配置文件清单
const requiredFiles = [
  'package.json',
  '.env.production',
  'nginx.conf',
  'Dockerfile',
  'docker-compose.yml',
  'prisma/schema.prisma', // 如果使用了 Prisma
  'prisma.config.ts', // 如果使用了 Prisma 配置文件
  'enrollment_plans.sql',
];

// 辅助函数：递归复制文件夹
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function runPackage() {
  console.log('🚀 开始打包江苏专转本智能问答系统...');

  // 3. 检查并清理旧的 release 目录，确保每次都是全新干净的
  if (fs.existsSync(releaseDir)) {
    console.log('🧹 正在清理旧的 release 目录...');
    fs.rmSync(releaseDir, { recursive: true, force: true });
  }

  // 4. 新建 release 目录
  fs.mkdirSync(releaseDir, { recursive: true });

  // 5. 复制 dist 文件夹
  const distSrc = path.join(rootDir, 'dist');
  const distDest = path.join(releaseDir, 'dist');
  if (fs.existsSync(distSrc)) {
    console.log('📦 正在复制编译产物 dist 文件夹...');
    copyDirSync(distSrc, distDest);
  } else {
    console.error('❌ 错误：未找到 dist 文件夹，请先执行 npm run build 编译项目！');
    process.exit(1);
  }

  // 6. 复制必需的配置文件
  console.log('📂 正在同步核心配置文件...');
  requiredFiles.forEach((file) => {
    const srcPath = path.join(rootDir, file);
    const destPath = path.join(releaseDir, file);

    if (fs.existsSync(srcPath)) {
      // 自动创建多层目录（例如 prisma/schema.prisma 所需的 prisma 文件夹）
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
      console.log(`  ✓ 已成功复制: ${file}`);
    } else {
      console.warn(`  ⚠️ 提示：未找到文件 ${file}，已跳过（如果是必需文件，请记得补齐）`);
    }
  });

  console.log('\n🎉 打包完成！所有上线必需文件均已就位。');
  console.log(`📂 请直接将项目根目录下的 [ release ] 文件夹整体上传到服务器部署。`);
}

runPackage();
