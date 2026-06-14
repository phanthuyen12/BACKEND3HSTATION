const bannerModel = require('../models/bannerModel');

// Admin creates a banner
exports.createBanner = async (req, res, next) => {
  try {
    const { title, imageUrl, link, isActive, position } = req.body;
    
    if (!title || !imageUrl) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tiêu đề và ảnh banner' });
    }

    const banner = await bannerModel.createBanner({
      title,
      imageUrl,
      link,
      isActive: isActive !== undefined ? isActive : true,
      position: position || 0
    });

    res.status(201).json({
      success: true,
      message: 'Tạo banner thành công',
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

// Admin gets all banners
exports.getAdminBanners = async (req, res, next) => {
  try {
    const banners = await bannerModel.getAllBanners();

    res.status(200).json({
      success: true,
      data: banners,
    });
  } catch (error) {
    next(error);
  }
};

// Admin updates a banner
exports.updateBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const banner = await bannerModel.updateBanner(id, updateData);

    if (!banner) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy banner' });
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật banner thành công',
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

// Admin deletes a banner
exports.deleteBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const banner = await bannerModel.getBannerById(id);
    
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy banner' });
    }

    await bannerModel.deleteBanner(id);

    res.status(200).json({
      success: true,
      message: 'Xóa banner thành công',
    });
  } catch (error) {
    next(error);
  }
};

// Client gets active banners
exports.getActiveBanners = async (req, res, next) => {
  try {
    const banners = await bannerModel.getActiveBanners();

    res.status(200).json({
      success: true,
      data: banners,
    });
  } catch (error) {
    next(error);
  }
};
