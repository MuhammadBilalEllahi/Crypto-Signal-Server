/* eslint-disable prettier/prettier */
import { Body, Controller, Post } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';

@Controller('chat')
export class ChatController {
    constructor (private chatGateway: ChatGateway){}

    @Post('send')
    sendMessage(@Body() body: {message: string}){
        this.chatGateway.sendMessageToClients(body.message);
        return { success: true, message: 'Message broadcasted'};
    }
}
