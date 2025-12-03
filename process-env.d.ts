declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: "development" | "production" | "test";
            PORT: number;
            MONGODB_URI: string;
            EMAIL_FROM: string;
            EMAIL_SERVER_HOST: string;
            EMAIL_SERVER_PORT: string;
            EMAIL_SERVER_USER: string;
            EMAIL_SERVER_PASSWORD: string;
        }
    }
}