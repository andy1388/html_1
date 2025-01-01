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
        
        console.log('Received submission with filename:', filename);

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

        // 如果有圖片，保存圖片文件
        if (image && filename) {
            console.log('Processing image:', filename);
            
            // 從Base64中提取實際的圖片數據
            const base64Data = image.split(',')[1];
            
            try {
                // 保存圖片到GitHub倉庫
                const imageResponse = await octokit.repos.createOrUpdateFileContents({
                    owner: "andy1388",
                    repo: "html_1",
                    path: `images/${filename}`,
                    message: `Upload image: ${filename}`,
                    content: base64Data,
                    branch: "main"
                });

                console.log('Image uploaded successfully:', imageResponse.data.content.path);

                // 在JSON中添加完整的圖片URL
                submissionData.imageUrl = `images/${filename}`;
                console.log('Image URL saved:', submissionData.imageUrl);
            } catch (error) {
                console.error("保存圖片失敗:", error);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ 
                        message: "圖片保存失敗",
                        error: error.message 
                    })
                };
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
        console.error("Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                message: "服務器錯誤",
                error: error.message
            })
        };
    }
}; 