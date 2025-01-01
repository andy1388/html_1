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

        // 基本驗證
        if (!process.env.GITHUB_TOKEN) {
            throw new Error('未配置 GitHub Token');
        }

        if (!name || !email || !message) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "必填字段缺失" })
            };
        }

        // 準備提交數據
        const submissionData = {
            name,
            email,
            message,
            timestamp
        };

        // 處理圖片上傳
        if (image && filename) {
            try {
                // 從 Base64 提取圖片數據
                const base64Data = image.split(',')[1];
                if (!base64Data) {
                    throw new Error('無效的圖片數據');
                }

                // 上傳圖片
                await octokit.repos.createOrUpdateFileContents({
                    owner: "andy1388",
                    repo: "html_1",
                    path: `images/${filename}`,
                    message: `Upload image: ${filename}`,
                    content: base64Data,
                    branch: "main"
                });

                // 添加圖片URL到提交數據
                submissionData.imageUrl = `images/${filename}`;
            } catch (error) {
                console.error('圖片上傳錯誤:', error);
                throw new Error('圖片上傳失敗');
            }
        }

        // 保存提交數據
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
            body: JSON.stringify({
                message: "提交成功",
                imageUrl: submissionData.imageUrl || null
            })
        };

    } catch (error) {
        console.error('錯誤:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "提交失敗",
                error: error.message
            })
        };
    }
}; 