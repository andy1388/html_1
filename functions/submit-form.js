import dotenv from 'dotenv';
import 'isomorphic-fetch';
import { Octokit } from "@octokit/rest";

// 加载环境变量
dotenv.config();

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

export const handler = async function(event, context) {
    try {
        const data = JSON.parse(event.body);
        const { name, email, message, image, timestamp, filename } = data;

        // 基本數據驗證
        if (!name || !email || !message) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "必填字段缺失" })
            };
        }

        // 準備JSON數據
        const submissionData = {
            name,
            email,
            message,
            timestamp
        };

        // 如果有圖片，保存圖片文件
        if (image && filename) {
            // 從Base64中提取實際的圖片數據
            const base64Data = image.split(',')[1];
            
            // 保存圖片到GitHub倉庫
            try {
                await octokit.repos.createOrUpdateFileContents({
                    owner: "andy1388", // 替換為您的GitHub用戶名
                    repo: "html_1",    // 替換為您的倉庫名
                    path: `images/${filename}`, // 圖片保存路徑
                    message: `Upload image: ${filename}`,
                    content: base64Data,
                    branch: "main"     // 或您的目標分支名
                });

                // 在JSON中添加圖片引用
                submissionData.imageUrl = `images/${filename}`;
            } catch (error) {
                console.error("保存圖片失敗:", error);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ message: "圖片保存失敗" })
                };
            }
        }

        // 保存提交數據為JSON文件
        const jsonFilename = `submissions/${timestamp.replace(/[:.]/g, '-')}Z.json`;
        await octokit.repos.createOrUpdateFileContents({
            owner: "andy1388",
            repo: "html_1",
            path: jsonFilename,
            message: `New submission from ${name}`,
            content: Buffer.from(JSON.stringify(submissionData, null, 2)).toString('base64'),
            branch: "main"
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "提交成功" })
        };
    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "服務器錯誤" })
        };
    }
}; 