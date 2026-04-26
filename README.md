# WjHelper

《无尽冬日》TapTap [官方公告](https://www.taptap.cn/app/521534/topic?type=official)礼包码整理页：单页展示、一键复制；数据由 `scripts/scrape_codes.py` 解析，`codes.json` 供前端打包进静态资源。

- 仓库：[github.com/Nestordu/WjHelper](https://github.com/Nestordu/WjHelper)
- 在线站点（需先在仓库里打开 GitHub Pages）：[nestordu.github.io/WjHelper](https://nestordu.github.io/WjHelper/)

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开终端提示的本地地址（一般为 `http://localhost:5173/`）。

## 与 GitHub 关联并推送

```bash
git init   # 若尚未初始化
git remote add origin https://github.com/Nestordu/WjHelper.git
git branch -M main
git add .
git commit -m "Initial commit"
git push -u origin main
```

若已存在其他 `origin`，可先 `git remote remove origin` 再执行 `add`。

## GitHub Pages（指向首页）

1. 将代码推送到默认分支（`main` 或 `master`）。
2. 打开仓库 **Settings → Pages**。
3. **Build and deployment** 里 **Source** 选择 **GitHub Actions**（不要选 Deploy from a branch）。
4. 在 **Actions** 里等待 **Deploy GitHub Pages**  workflow 跑完；成功后站点为  
   **https://nestordu.github.io/WjHelper/**（首页即 `index.html` 中的主界面）。

若将来仓库改名，请同步修改 `.github/workflows/deploy-pages.yml` 中的 `VITE_PAGES_BASE` 与 `package.json` 的 `homepage`。

### 本地按 Pages 子路径预览

```bash
npm run build:pages
npm run preview:pages
```

浏览器访问终端中的地址，路径应包含 `/WjHelper/`。

## 定时更新礼包数据

工作流 **Scrape Endless Winter Codes** 会更新 `src/data/codes.json` 并提交；推送后再由 **Deploy GitHub Pages** 重新构建站点即可。
