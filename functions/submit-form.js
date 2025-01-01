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
        console.log('Starting form submission handler');
        console.log('GitHub Token exists:', !!process.env.GITHUB_TOKEN);
        
        const data = JSON.parse(event.body);
        const { name, email, message, image, timestamp, filename } = data;
        
        console.log('Received submission:', { name, email, hasImage: !!image, filename });

        // 檢查 GitHub Token
        if (!process.env.GITHUB_TOKEN) {
            throw new Error('GitHub Token not configured');
        }

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

        // 如果有圖片，直接嘗試上傳
        if (image && filename) {
            console.log('Processing image:', filename);
            
            // 從Base64中提取實際的圖片數據
            const base64Data = image.split(',')[1];
            
            if (!base64Data) {
                throw new Error('Invalid image data format');
            }

            try {
                // 直接嘗試上傳圖片
                const imageResponse = await octokit.repos.createOrUpdateFileContents({
                    owner: "andy1388",
                    repo: "html_1",
                    path: `images/${filename}`,
                    message: `Upload image: ${filename}`,
                    content: base64Data,
                    branch: "main"
                });

                console.log('Image upload response:', {
                    status: imageResponse.status,
                    path: imageResponse.data?.content?.path,
                    url: imageResponse.data?.content?.download_url
                });

                if (imageResponse.status === 201 || imageResponse.status === 200) {
                    submissionData.imageUrl = `images/${filename}`;
                    console.log('Image URL saved:', submissionData.imageUrl);
                } else {
                    throw new Error(`Unexpected response status: ${imageResponse.status}`);
                }
            } catch (error) {
                console.error('Image upload error:', {
                    message: error.message,
                    status: error.status,
                    response: error.response?.data,
                    stack: error.stack
                });
                throw error;
            }
        }

        // 保存提交數據為JSON文件
        const jsonFilename = `submissions/${timestamp.replace(/[:.]/g, '-')}Z.json`;
        console.log('Saving submission data to:', jsonFilename);

        const jsonResponse = await octokit.repos.createOrUpdateFileContents({
            owner: "andy1388",
            repo: "html_1",
            path: jsonFilename,
            message: `New submission from ${name}`,
            content: Buffer.from(JSON.stringify(submissionData, null, 2)).toString('base64'),
            branch: "main"
        });

        console.log('Submission data saved successfully');

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                message: "提交成功",
                imageUrl: submissionData.imageUrl || null
            })
        };
    } catch (error) {
        console.error("Error details:", {
            message: error.message,
            stack: error.stack,
            status: error.status,
            response: error.response?.data
        });
        
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                message: "服務器錯誤",
                error: error.message,
                details: error.stack,
                status: error.status
            })
        };
    }
}; 