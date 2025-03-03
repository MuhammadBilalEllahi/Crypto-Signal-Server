"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
const morgan = require("morgan");
const admin = require("firebase-admin");
admin.initializeApp({
    credential: admin.credential.cert(require('../trading-app-1bc0e-firebase-adminsdk-fbsvc-1dee713265.json')),
});
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use(morgan('dev'));
    app.enableCors({
        origin: '*',
        methods: 'GET,POST,PUT,DELETE,OPTIONS',
        allowedHeaders: 'Content-Type, Authorization',
        credentials: true,
    });
    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app));
    const PORT = process.env.PORT || 4000;
    await app.listen(PORT, '0.0.0.0', () => {
        console.log('Connected at port 4000');
    });
}
bootstrap();
//# sourceMappingURL=main.js.map