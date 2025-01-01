import dotenv from 'dotenv';
import 'isomorphic-fetch';
import { Octokit } from "@octokit/rest";

// 加载环境变量
dotenv.config();

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

export const handler = async function(event, context) {
    // 添加基本的響應頭
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': '*',
        'Access-Control-Allow-Headers': '*'
    };

    // 處理 OPTIONS 請求
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const data = JSON.parse(event.body);
        console.log('Received data:', data);

        if (!data.name || !data.email || !data.message) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: "必填字段缺失" })
            };
        }

        const submissionData = {
            name: data.name,
            email: data.email,
            message: data.message,
            timestamp: data.timestamp || new Date().toISOString()
        };

        const jsonFilename = `submissions/${submissionData.timestamp.replace(/[:.]/g, '-')}Z.json`;
        
        await octokit.repos.createOrUpdateFileContents({
            owner: "andy1388",
            repo: "html_1",
            path: jsonFilename,
            message: `New submission from ${submissionData.name}`,
            content: Buffer.from(JSON.stringify(submissionData, null, 2)).toString('base64'),
            branch: "main"
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: "提交成功" })
        };

    } catch (error) {
        console.error('Handler error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                message: '提交失敗',
                error: error.message
            })
        };
    }
}; 