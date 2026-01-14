import apiClient from './client';
import type { RFIDCard, RFIDVerifyResponse } from '../types';

export const rfidService = {
    // Register RFID card
    async register(cardUid: string, userName: string): Promise<RFIDCard> {
        const response = await apiClient.post<RFIDCard>('/api/rfid/register', {
            card_uid: cardUid,
            user_name: userName,
        });
        return response.data;
    },

    // Verify RFID card
    async verify(cardUid: string): Promise<RFIDVerifyResponse> {
        const response = await apiClient.post<RFIDVerifyResponse>('/api/rfid/verify', {
            card_uid: cardUid,
        });
        return response.data;
    },

    // Get all cards
    async getCards(): Promise<RFIDCard[]> {
        const response = await apiClient.get<RFIDCard[]>('/api/rfid/cards');
        return response.data;
    },

    // Delete card
    async deleteCard(cardId: number): Promise<void> {
        await apiClient.delete(`/api/rfid/${cardId}`);
    },
};
