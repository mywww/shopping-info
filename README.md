# 购物优惠助手 (Shopping Deal Assistant)

一个面向手机用户的购物优惠信息聚合与推送工具。用户可录入购物需求（商品关键词），系统定时从豆瓣小组爬取优惠帖子，匹配成功后通过飞书机器人推送通知。

## 技术栈

- **前端**: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **后端**: Python FastAPI
- **数据库**: Supabase (PostgreSQL)
- **部署**: Vercel (前端) + Railway (后端)

## 项目结构

```
shopping-crawler/
├── frontend/          # Next.js 前端应用
└── backend/          # FastAPI 后端应用
```

## 开发说明

### 环境变量

**后端 (.env)**:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret_key
FEISHU_WEBHOOK=your_feishu_webhook  # 可选
```

**前端 (.env.local)**:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 运行

**后端**:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**前端**:
```bash
cd frontend
npm install
npm run dev
```

## License

MIT