import dotenv from 'dotenv';
import 'isomorphic-fetch';

// 加载环境变量
dotenv.config();

export const handler = async function(event, context) {
    // 添加 CORS 头
    const headers = {
        'Access-Control-Allow-Origin': 'https://andy1388.github.io',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // 处理 OPTIONS 请求
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            headers,
            body: 'Method Not Allowed' 
        };
    }

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

    try {
        const formData = JSON.parse(event.body);
        
        // 添加更多日志
        console.log('Received form data:', formData);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `submissions/${timestamp}.json`;  // 移除 encodeURIComponent
        
        const fileContent = JSON.stringify({
            name: formData.name || '',
            email: formData.email || '',
            message: formData.message || '',
            timestamp: formData.timestamp || new Date().toISOString()
        }, null, 2);

        const encodedContent = Buffer.from(fileContent).toString('base64');
        
        // 直接使用原始路径
        const url = `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${filename}`;
        
        console.log('Making GitHub API request to:', url);

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
                content: encodedContent,
                branch: 'main'  // 明确指定分支
            })
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('GitHub API Error:', {
                status: response.status,
                statusText: response.statusText,
                data: responseData
            });
            throw new Error(`GitHub API error: ${response.status} - ${JSON.stringify(responseData)}`);
        }

        console.log('GitHub API Success:', {
            filename,
            sha: responseData.content?.sha
        });

        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message: 'Success',
                filename: filename,
                sha: responseData.content?.sha
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
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Submission failed', 
                details: error.message
            })
        };
    }
}; 