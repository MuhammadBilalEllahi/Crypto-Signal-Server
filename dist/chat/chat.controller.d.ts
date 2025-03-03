import { ChatGateway } from './chat.gateway';
export declare class ChatController {
    private chatGateway;
    constructor(chatGateway: ChatGateway);
    sendMessage(body: {
        message: string;
    }): {
        success: boolean;
        message: string;
    };
}
