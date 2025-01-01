import dotenv from 'dotenv';
import 'isomorphic-fetch';
import { Octokit } from "@octokit/rest";

// 加载环境变量
dotenv.config();

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

export const handler = async function(event, context) {
    // 設置基本的 CORS 響應頭
    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://andy1388.github.io',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
    };

    // 處理預檢請求
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    try {
        // 所有響應都添加 CORS 頭部
        const headers = {
            ...corsHeaders,
            'Content-Type': 'application/json'
        };

        // 其餘代碼保持不變，但確保每個響應都包含 headers
        if (!process.env.GITHUB_TOKEN) {
            console.error('GitHub Token is missing');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ message: 'GitHub Token 未配置' })
            };
        }

        // 解析請求數據
        let data;
        try {
            data = JSON.parse(event.body);
        } catch (parseError) {
            console.error('Failed to parse request body:', parseError);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: "無效的請求數據格式" })
            };
        }

        const { name, email, message, image, timestamp, filename } = data;

        // 基本驗證
        if (!name || !email || !message) {
            return {
                statusCode: 400,
                headers,
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

        // 檢查圖片數據
        if (image && filename) {
            console.log('Processing image:', {
                filename,
                imageLength: image.length,
                hasBase64Prefix: image.startsWith('data:image/')
            });

            const base64Data = image.split(',')[1];
            if (!base64Data) {
                throw new Error('圖片數據格式無效');
            }

            try {
                // 嘗試上傳圖片
                const imageUploadResponse = await octokit.repos.createOrUpdateFileContents({
                    owner: "andy1388",
                    repo: "html_1",
                    path: `images/${filename}`,
                    message: `Upload image: ${filename}`,
                    content: base64Data,
                    branch: "main"
                });

                console.log('Image upload response:', {
                    status: imageUploadResponse.status,
                    path: imageUploadResponse.data?.content?.path
                });

                if (imageUploadResponse.data.content) {
                    console.log('Image uploaded successfully');
                } else {
                    throw new Error('圖片上傳響應無效');
                }
            } catch (uploadError) {
                console.error('Image upload error:', {
                    message: uploadError.message,
                    status: uploadError.status,
                    response: uploadError.response?.data
                });
                throw new Error(`圖片上傳失敗: ${uploadError.message}`);
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
            headers,
            body: JSON.stringify({
                message: "提交成功",
                imageUrl: submissionData.imageUrl || null
            })
        };

    } catch (error) {
        console.error('Handler error:', error);
        return {
            statusCode: 500,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: "提交失敗",
                error: error.message
            })
        };
    }
}; 