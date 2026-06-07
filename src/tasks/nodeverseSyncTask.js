const nodeverseVpsService = require('../services/vps/nodeverseVpsService');

/**
 * Task tự động sync danh sách VPS devices từ Nodeverse API
 * Chu kỳ: 5 tiếng một lần
 */
const startNodeverseSyncTask = () => {
    const FIVE_HOURS = 5 * 60 * 60 * 1000;
    
    console.log('[Task] Khởi tạo Nodeverse Sync Task (Chu kỳ: 5 tiếng)');
    
    // Chạy lần đầu sau khi start 30 giây (tránh làm chậm startup boot)
    setTimeout(async () => {
        try {
            console.log('[Task] Đang thực hiện Nodeverse Sync định kỳ...');
            const result = await nodeverseVpsService.syncDevicesFromNodeverse();
            console.log(`[Task] Nodeverse Sync thành công: ${result.synced} devices.`);
        } catch (err) {
            console.error('[Task] Nodeverse Sync thất bại:', err.message);
        }
    }, 30000);

    // Lên lịch chạy định kỳ (5 tiếng sync devices một lần)
    setInterval(async () => {
        try {
            console.log('[Task] Đang thực hiện Nodeverse Sync định kỳ...');
            const result = await nodeverseVpsService.syncDevicesFromNodeverse();
            console.log(`[Task] Nodeverse Sync thành công: ${result.synced} devices.`);
        } catch (err) {
            console.error('[Task] Nodeverse Sync thất bại:', err.message);
        }
    }, FIVE_HOURS);

    // Lên lịch chạy định kỳ check email (gửi email cho những đơn hàng vừa được kích hoạt)
    // Chạy mỗi 1 phút
    const ONE_MINUTE = 60 * 1000;
    setInterval(async () => {
        try {
            const result = await nodeverseVpsService.processPendingEmailNotifications();
            if (result.processed > 0) {
                console.log(`[Task] Auto-Activation-Email thành công: ${result.success}/${result.processed}`);
            }
        } catch (err) {
            console.error('[Task] Auto-Activation-Email thất bại:', err.message);
        }
    }, ONE_MINUTE);
};

module.exports = { startNodeverseSyncTask };
