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
        // 檢查 Token
        if (!process.env.GITHUB_TOKEN) {
            console.error('GitHub Token is missing');
            throw new Error('GitHub Token 未配置');
        }

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

        // 檢查圖片數據
        if (image && filename) {
            console.log('Processing image:', {
                filename,
                imageLength: image?.length || 0,
                hasBase64Prefix: image?.startsWith('data:image/') || false
            });

            // 验证图片数据格式
            if (!image.startsWith('data:image/')) {
                throw new Error('無效的圖片格式');
            }

            const base64Data = image.split(',')[1];
            if (!base64Data) {
                throw new Error('圖片數據格式無效');
            }

            try {
                // 添加错误处理和重试逻辑
                let retryCount = 0;
                const maxRetries = 3;
                let imageUploadResponse;

                while (retryCount < maxRetries) {
                    try {
                        imageUploadResponse = await octokit.repos.createOrUpdateFileContents({
                            owner: "andy1388",
                            repo: "html_1",
                            path: `images/${filename}`,
                            message: `Upload image: ${filename}`,
                            content: base64Data,
                            branch: "main"
                        });
                        break; // 如果成功，跳出循环
                    } catch (err) {
                        retryCount++;
                        if (retryCount === maxRetries) {
                            throw err;
                        }
                        // 等待一段时间后重试
                        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                    }
                }

                if (!imageUploadResponse?.data?.content) {
                    throw new Error('圖片上傳響應無效');
                }

                // 添加图片URL到提交数据
                submissionData.imageUrl = `https://raw.githubusercontent.com/andy1388/html_1/main/images/${filename}`;

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
            body: JSON.stringify({
                message: "提交成功",
                imageUrl: submissionData.imageUrl || null
            })
        };

    } catch (error) {
        console.error('Handler error:', {
            message: error.message,
            stack: error.stack
        });
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "提交失敗",
                error: error.message,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
}; 