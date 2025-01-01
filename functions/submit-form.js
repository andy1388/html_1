import dotenv from 'dotenv';
import 'isomorphic-fetch';
import { Octokit } from "@octokit/rest";

// 加载环境变量
dotenv.config();

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

export const handler = async function(event, context) {
    // 設置 CORS 頭部
    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://andy1388.github.io',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // 處理 OPTIONS 請求
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    try {
        // 解析請求數據
        const data = JSON.parse(event.body);
        console.log('Received data:', data);

        // 基本驗證
        if (!data.name || !data.email || !data.message) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: "必填字段缺失" })
            };
        }

        // 準備提交數據
        const submissionData = {
            name: data.name,
            email: data.email,
            message: data.message,
            timestamp: data.timestamp || new Date().toISOString()
        };

        // 保存提交數據
        const jsonFilename = `submissions/${submissionData.timestamp.replace(/[:.]/g, '-')}Z.json`;
        
        try {
            await octokit.repos.createOrUpdateFileContents({
                owner: "andy1388",
                repo: "html_1",
                path: jsonFilename,
                message: `New submission from ${submissionData.name}`,
                content: Buffer.from(JSON.stringify(submissionData, null, 2)).toString('base64'),
                branch: "main"
            });
        } catch (githubError) {
            console.error('GitHub API error:', githubError);
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ message: '保存數據失敗' })
            };
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: "提交成功"
            })
        };

    } catch (error) {
        console.error('Handler error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: '提交失敗',
                error: error.message
            })
        };
    }
}; 