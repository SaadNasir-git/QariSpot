import { RowDataPacket } from "mysql2";
import getDatabaseConnection from "./mysql2";

export async function getQaris() {
    const conn = await getDatabaseConnection();
    const [result] = await conn.query<RowDataPacket[] & qari[]>('SELECT * FROM qari');
    return result;
}

export async function getQariData(qariId: string): Promise<qari | null> {
    try {
        if (!qariId) return null;
        const conn = await getDatabaseConnection();
        const [qariData] = await conn.query<RowDataPacket[] & qari[]>('SELECT * FROM qari WHERE id=?', [Number(qariId)]);
        return qariData.length > 0 ? qariData[0] : null;
    } catch (error) {
        return null;
    }
}