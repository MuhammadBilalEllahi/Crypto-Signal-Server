import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
export declare class UserService {
    private userModel;
    constructor(userModel: Model<UserDocument>);
    findByFirebaseId(uid: string): Promise<User | null>;
    findOrCreate(userData: {
        uid: string;
        email: string;
        role: string;
    }): Promise<User>;
    getUserById(id: string): Promise<User | null>;
    createUser(userData: {
        uid: string;
        email: string;
        role?: string;
    }): Promise<User>;
    updateUser(uid: string, updateData: Partial<User>): Promise<User | null>;
    deleteUser(uid: string): Promise<User | null>;
    setUserRole(uid: string): Promise<{
        message: string;
    }>;
}
