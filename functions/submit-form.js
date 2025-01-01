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
        // 首先記錄收到的請求數據（注意不要記錄敏感信息）
        console.log('Received request with fields:', {
            hasName: !!event.body?.name,
            hasEmail: !!event.body?.email,
            hasMessage: !!event.body?.message,
            hasImage: !!event.body?.image,
            hasFilename: !!event.body?.filename
        });

        // 檢查 Token
        if (!process.env.GITHUB_TOKEN) {
            console.error('GitHub Token is missing');
            throw new Error('GitHub Token 未配置');
        }

        // 嘗試解析請求數據
        let data;
        try {
            data = JSON.parse(event.body);
            console.log('Successfully parsed request body');
        } catch (parseError) {
            console.error('Failed to parse request body:', parseError);
            throw new Error('請求數據格式無效');
        }

        const { name, email, message, image, timestamp, filename } = data;

        // 記錄基本驗證結果
        console.log('Validation check:', {
            name: !!name,
            email: !!email,
            message: !!message,
            timestamp: !!timestamp
        });

        // 準備提交數據
        const submissionData = {
            name,
            email,
            message,
            timestamp
        };

        // 先嘗試保存文字數據
        try {
            const jsonFilename = `submissions/${timestamp.replace(/[:.]/g, '-')}Z.json`;
            console.log('Attempting to save submission data to:', jsonFilename);
            
            await octokit.repos.createOrUpdateFileContents({
                owner: "andy1388",
                repo: "html_1",
                path: jsonFilename,
                message: `New submission from ${name}`,
                content: Buffer.from(JSON.stringify(submissionData, null, 2)).toString('base64'),
                branch: "main"
            });
            
            console.log('Successfully saved submission data');
        } catch (submissionError) {
            console.error('Failed to save submission:', submissionError);
            throw new Error(`提交數據保存失敗: ${submissionError.message}`);
        }

        // 如果有圖片才處理圖片上傳
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
                // 首先检查仓库访问权限
                try {
                    await octokit.repos.get({
                        owner: "andy1388",
                        repo: "html_1"
                    });
                } catch (repoError) {
                    console.error('Repository access error:', repoError);
                    throw new Error('無法訪問倉庫，請檢查權限設置');
                }

                // 检查images目录是否存在，如果不存在则创建
                try {
                    await octokit.repos.getContent({
                        owner: "andy1388",
                        repo: "html_1",
                        path: "images"
                    });
                } catch (dirError) {
                    // 如果目录不存在，创建它
                    if (dirError.status === 404) {
                        await octokit.repos.createOrUpdateFileContents({
                            owner: "andy1388",
                            repo: "html_1",
                            path: "images/.gitkeep",
                            message: "Create images directory",
                            content: "",
                            branch: "main"
                        });
                    }
                }

                // 尝试上传图片
                let retryCount = 0;
                const maxRetries = 3;
                let imageUploadResponse;

                while (retryCount < maxRetries) {
                    try {
                        // 检查文件是否已存在
                        try {
                            await octokit.repos.getContent({
                                owner: "andy1388",
                                repo: "html_1",
                                path: `images/${filename}`
                            });
                            // 如果文件存在，修改文件名
                            filename = `${Date.now()}-${filename}`;
                        } catch (fileError) {
                            // 文件不存在，可以继续
                        }

                        imageUploadResponse = await octokit.repos.createOrUpdateFileContents({
                            owner: "andy1388",
                            repo: "html_1",
                            path: `images/${filename}`,
                            message: `Upload image: ${filename}`,
                            content: base64Data,
                            branch: "main"
                        });
                        break;
                    } catch (err) {
                        console.error(`Upload attempt ${retryCount + 1} failed:`, err);
                        retryCount++;
                        if (retryCount === maxRetries) {
                            throw new Error(`上傳失敗: ${err.message}`);
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                    }
                }

                if (!imageUploadResponse?.data?.content) {
                    throw new Error('圖片上傳響應無效');
                }

                // 使用完整的原始URL
                submissionData.imageUrl = `https://raw.githubusercontent.com/andy1388/html_1/main/images/${filename}`;
                console.log('Image URL:', submissionData.imageUrl);

            } catch (uploadError) {
                console.error('Image upload error:', {
                    message: uploadError.message,
                    status: uploadError.status,
                    response: uploadError.response?.data
                });
                throw new Error(`圖片上傳失敗: ${uploadError.message}`);
            }
        }

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
            stack: error.stack,
            type: error.constructor.name,
            details: error.response?.data || error.data
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