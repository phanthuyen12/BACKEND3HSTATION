const { Zalo, LoginQRCallbackEventType } = require('zca-js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

class ZaloEngineService {
    constructor() {
        this.zalo = null;
        this.api = null;
        this.status = 'DISCONNECTED'; // 'DISCONNECTED' | 'SCANNING' | 'CONNECTED' | 'EXPIRED'
        this.qrCodeDataUrl = null;
        this.qrCodeRaw = null;
        this.userInfo = null;
        this.listener = null;
        this.messageCallbacks = [];
        this.sessionFilePath = path.join(__dirname, '../../data/zalo_session.json');

        // Ensure data directory exists
        const dataDir = path.dirname(this.sessionFilePath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    }

    /**
     * Khởi tạo và tự động kết nối lại nếu có Session lưu sẵn
     */
    async autoConnect() {
        try {
            if (fs.existsSync(this.sessionFilePath)) {
                console.log('[ZaloEngine] Nạp session lưu sẵn từ zalo_session.json...');
                const credentials = JSON.parse(fs.readFileSync(this.sessionFilePath, 'utf8'));
                this.zalo = new Zalo({ logging: false });
                this.api = await this.zalo.login(credentials);
                this.status = 'CONNECTED';
                await this.initAccountInfoAndListener();
                console.log('[ZaloEngine] Tự động kết nối Zalo thành công!');
                return true;
            }
        } catch (err) {
            console.error('[ZaloEngine] Lỗi tự động nạp session Zalo:', err.message);
            this.status = 'DISCONNECTED';
            this.clearSession();
        }
        return false;
    }

    /**
     * Bắt đầu luồng đăng nhập bằng mã QR Code
     */
    async startQRLogin() {
        if (this.status === 'CONNECTED' && this.api) {
            return {
                status: 'CONNECTED',
                message: 'Tài khoản Zalo đã được kết nối.',
                userInfo: this.userInfo
            };
        }

        this.status = 'SCANNING';
        this.qrCodeDataUrl = null;
        this.zalo = new Zalo({ logging: false });

        return new Promise((resolve, reject) => {
            let isResolved = false;

            this.zalo.loginQR({}, async (event) => {
                try {
                    switch (event.type) {
                        case LoginQRCallbackEventType.QRCodeGenerated: {
                            const { qrData, qrCodeUrl } = event.data;
                            this.qrCodeRaw = qrData || qrCodeUrl;
                            if (qrData || qrCodeUrl) {
                                this.qrCodeDataUrl = await qrcode.toDataURL(qrData || qrCodeUrl);
                            }
                            console.log('[ZaloEngine] Đã sinh mã QR Code đăng nhập Zalo mới.');
                            if (!isResolved) {
                                isResolved = true;
                                resolve({
                                    status: 'SCANNING',
                                    qrCodeDataUrl: this.qrCodeDataUrl,
                                    rawUrl: this.qrCodeRaw
                                });
                            }
                            break;
                        }

                        case LoginQRCallbackEventType.GotScanInfo: {
                            console.log('[ZaloEngine] Người dùng đã quét mã QR trên điện thoại.');
                            break;
                        }

                        case LoginQRCallbackEventType.GotLoginInfo: {
                            console.log('[ZaloEngine] Đăng nhập Zalo thành công! Lưu session...');
                            const credentials = event.data; // { cookie, imei, userAgent }
                            fs.writeFileSync(this.sessionFilePath, JSON.stringify(credentials, null, 2));
                            this.status = 'CONNECTED';
                            this.qrCodeDataUrl = null;
                            break;
                        }
                    }
                } catch (err) {
                    console.error('[ZaloEngine] Lỗi trong QR callback:', err);
                }
            }).then(async (api) => {
                this.api = api;
                this.status = 'CONNECTED';
                await this.initAccountInfoAndListener();
                console.log('[ZaloEngine] API Zalo sẵn sàng hoạt động.');
            }).catch((err) => {
                console.error('[ZaloEngine] Lỗi đăng nhập QR Zalo:', err);
                this.status = 'DISCONNECTED';
                this.qrCodeDataUrl = null;
                if (!isResolved) {
                    isResolved = true;
                    reject(err);
                }
            });
        });
    }

    /**
     * Khởi tạo thông tin tài khoản và kết nối WebSocket Listener
     */
    async initAccountInfoAndListener() {
        if (!this.api) return;

        try {
            const ownId = this.api.getOwnId ? this.api.getOwnId() : null;
            if (ownId && this.api.getUserInfo) {
                const info = await this.api.getUserInfo(ownId);
                this.userInfo = info || { uid: ownId };
            }
        } catch (e) {
            console.warn('[ZaloEngine] Không lấy được đầy đủ thông tin user:', e.message);
        }

        try {
            if (this.api.listener) {
                this.listener = this.api.listener;
                this.listener.start();

                this.listener.on('message', (message) => {
                    console.log('[ZaloEngine] Nhận tin nhắn Zalo mới:', message);
                    this.messageCallbacks.forEach(cb => cb(message));
                });

                this.listener.on('connected', () => {
                    console.log('[ZaloEngine] Listener WebSocket đã kết nối tới Zalo.');
                });

                this.listener.on('closed', (reason) => {
                    console.warn('[ZaloEngine] Listener WebSocket bị đóng:', reason);
                });
            }
        } catch (e) {
            console.error('[ZaloEngine] Lỗi khởi tạo Listener:', e);
        }
    }

    /**
     * Đăng ký callback khi nhận được tin nhắn Zalo mới (dành cho WebSocket / Socket.IO Omichat)
     */
    onMessageReceived(callback) {
        if (typeof callback === 'function') {
            this.messageCallbacks.push(callback);
        }
    }

    /**
     * Lấy trạng thái hiện tại của tài khoản Zalo
     */
    getStatus() {
        return {
            status: this.status,
            qrCodeDataUrl: this.qrCodeDataUrl,
            userInfo: this.userInfo
        };
    }

    /**
     * Gửi tin nhắn text tới bạn bè / nhóm trên Zalo
     */
    async sendMessage(threadId, textMessage, isGroup = false) {
        if (this.status !== 'CONNECTED' || !this.api) {
            throw new Error('Chưa kết nối tài khoản Zalo. Vui lòng quét mã QR để đăng nhập.');
        }

        try {
            const threadType = isGroup ? 1 : 0; // 0: User, 1: Group
            const result = await this.api.sendMessage(
                { msg: textMessage },
                threadId,
                threadType
            );
            return {
                success: true,
                data: result
            };
        } catch (err) {
            console.error('[ZaloEngine] Lỗi gửi tin nhắn Zalo:', err);
            throw err;
        }
    }

    /**
     * Lấy danh sách bạn bè gần nhất
     */
    async getFriends() {
        if (this.status !== 'CONNECTED' || !this.api) {
            throw new Error('Chưa kết nối tài khoản Zalo.');
        }
        return await this.api.getAllFriends();
    }

    /**
     * Lấy danh sách nhóm chat
     */
    async getGroups() {
        if (this.status !== 'CONNECTED' || !this.api) {
            throw new Error('Chưa kết nối tài khoản Zalo.');
        }
        return await this.api.getAllGroups();
    }

    /**
     * Đăng xuất tài khoản Zalo & Xóa session
     */
    logout() {
        this.clearSession();
        if (this.listener && typeof this.listener.stop === 'function') {
            try { this.listener.stop(); } catch (e) {}
        }
        this.api = null;
        this.zalo = null;
        this.status = 'DISCONNECTED';
        this.qrCodeDataUrl = null;
        this.userInfo = null;
        console.log('[ZaloEngine] Đã đăng xuất tài khoản Zalo.');
        return { success: true, message: 'Đã đăng xuất tài khoản Zalo.' };
    }

    clearSession() {
        if (fs.existsSync(this.sessionFilePath)) {
            try { fs.unlinkSync(this.sessionFilePath); } catch (e) {}
        }
    }
}

const zaloEngine = new ZaloEngineService();
module.exports = zaloEngine;
