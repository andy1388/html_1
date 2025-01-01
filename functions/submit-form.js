import dotenv from 'dotenv';
import 'isomorphic-fetch';
import { Octokit } from "@octokit/rest";

// 加载环境变量
dotenv.config();

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

export const handler = async function(event, context) {
    // 允許所有來源的 CORS 請求
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',  // 改為允許所有來源
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'true'
    };

    // 如果是預檢請求，立即返回
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,  // 使用 204 No Content
            headers: corsHeaders,
            body: ''
        };
    }

    // 確保每個響應都包含 CORS 頭部
    const headers = {
        ...corsHeaders,
        'Content-Type': 'application/json'
    };

    try {
        // 檢查請求方法
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405,
                headers,
                body: JSON.stringify({ message: '方法不允許' })
            };
        }

        // 解析請求數據
        let data;
        try {
            data = JSON.parse(event.body);
            console.log('Received data:', data);
        } catch (parseError) {
            console.error('Parse error:', parseError);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: '無效的請求數據格式' })
            };
        }

        // 基本驗證
        if (!data.name || !data.email || !data.message) {
            return {
                statusCode: 400,
                headers,
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
            throw new Error('保存數據失敗');
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: "提交成功"
            })
        };

    } catch (error) {
        console.error('Handler error:', error);
        return {
            statusCode: 500,
            headers,  // 確保錯誤響應也包含 CORS 頭部
            body: JSON.stringify({
                message: '提交失敗',
                error: error.message
            })
        };
    }
}; 