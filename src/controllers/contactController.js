const contactModel = require('../models/contactModel');

// Client creates a contact request
exports.createContact = async (req, res, next) => {
  try {
    const { name, phone, interest } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên và số điện thoại/Zalo' });
    }

    const contact = await contactModel.createContact({
      name,
      phone,
      interest,
    });

    res.status(201).json({
      success: true,
      message: 'Gửi yêu cầu tư vấn thành công',
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

// Admin gets all contact requests
exports.getContacts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    
    const result = await contactModel.listContacts({ page, limit, status, startDate, endDate });

    res.status(200).json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    });
  } catch (error) {
    next(error);
  }
};

// Admin updates a contact request status
exports.updateContactStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'contacted', 'resolved'].includes(status)) {
       return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }

    const contact = await contactModel.updateContactStatus(id, status);

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu tư vấn' });
    }

    res.status(200).json({
      success: true,
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};
