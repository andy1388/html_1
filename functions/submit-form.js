import dotenv from 'dotenv';
import 'isomorphic-fetch';

// 加载环境变量
dotenv.config();

export const handler = async function(event, context) {
    // 添加调试日志
    console.log('Environment variables:', {
        tokenPrefix: process.env.GITHUB_TOKEN?.substring(0, 4),
        tokenLength: process.env.GITHUB_TOKEN?.length,
        owner: process.env.GITHUB_OWNER,
        repo: process.env.GITHUB_REPO
    });

    // 检查环境变量是否存在
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_OWNER || !process.env.GITHUB_REPO) {
        console.error('Missing environment variables:', {
            hasToken: !!process.env.GITHUB_TOKEN,
            hasOwner: !!process.env.GITHUB_OWNER,
            hasRepo: !!process.env.GITHUB_REPO
        });
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error' })
        };
    }

    // 确保是 POST 请求
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const formData = JSON.parse(event.body);
        
        // 准备文件名和内容
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = encodeURIComponent(`submissions/${timestamp}.json`);
        
        // 使用 ASCII 字符串来存储内容
        const fileContent = JSON.stringify({
            name: formData.name || '',
            email: formData.email || '',
            message: formData.message || '',
            timestamp: formData.timestamp || new Date().toISOString()
        }, null, 2);

        // 转换为 base64
        const encodedContent = Buffer.from(fileContent).toString('base64');

        // 准备请求
        const url = `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${filename}`;
        
        console.log('Request URL:', url);
        console.log('Authorization header:', `token ${process.env.GITHUB_TOKEN.substring(0, 4)}...`);

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Netlify Function'
            },
            body: JSON.stringify({
                message: 'New form submission',
                content: encodedContent
            })
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('GitHub API Error:', responseData);
            throw new Error(`GitHub API error: ${response.status} - ${JSON.stringify(responseData)}`);
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message: 'Success',
                filename: decodeURIComponent(filename),
                sha: responseData.content.sha
            })
        };
    } catch (error) {
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Submission failed', 
                details: error.message
            })
        };
    }
}; 