const supportEmail = 'support@h3station.com';

const faqItems = [
  {
    question: '3HSTATION hỗ trợ những mảng nào trong hệ sinh thái MMO?',
    answer:
      'Bạn có thể nhận hỗ trợ cho khóa học, workflow automation, cloud VPS, phần mềm, nạp tiền và các vấn đề liên quan tới tài khoản học viên.'
  },
  {
    question: 'Tôi bị khóa quyền xem khóa học hoặc workflow thì phải làm gì?',
    answer:
      'Bạn hãy gửi mã tài khoản, tên khóa học hoặc workflow đang gặp lỗi. Đội ngũ support sẽ kiểm tra rank, quyền truy cập và hướng dẫn cách mở quyền phù hợp.'
  },
  {
    question: 'Nếu thanh toán thành công nhưng số dư chưa cập nhật thì sao?',
    answer:
      'Bạn chỉ cần gửi mã giao dịch hoặc ảnh chụp màn hình thanh toán. Hệ thống sẽ được kiểm tra đối soát để cộng lại số dư hoặc tạo yêu cầu xử lý thủ công khi cần.'
  },
  {
    question: '3HSTATION có hỗ trợ cài đặt và vận hành VPS automation không?',
    answer:
      'Có. Chúng tôi hỗ trợ các bước khởi tạo ban đầu, kiểm tra trạng thái VPS, hướng dẫn đăng nhập và xử lý các lỗi hạ tầng phổ biến liên quan tới việc triển khai automation.'
  },
  {
    question: 'Tôi nên liên hệ kênh nào khi cần phản hồi nhanh?',
    answer:
      'Trang liên hệ là điểm vào chính để tổng hợp thông tin. Bạn có thể gửi email, mở yêu cầu hỗ trợ hoặc chuyển tiếp sang kênh chat với đầy đủ nội dung để đội ngũ tiếp nhận nhanh hơn.'
  },
  {
    question: 'Thông tin cá nhân và dữ liệu học tập của tôi được dùng như thế nào?',
    answer:
      'Dữ liệu được dùng để xác thực tài khoản, cấp quyền truy cập dịch vụ, theo dõi tiến độ học tập và hỗ trợ chăm sóc khách hàng. Bạn có thể xem chi tiết trong trang chính sách.'
  }
];

const policySections = [
  {
    id: 'bao-mat',
    title: 'Chính sách bảo mật',
    summary:
      'Bảo vệ thông tin cá nhân, lịch sử giao dịch và dữ liệu học tập của người dùng trong toàn bộ hệ sinh thái 3HSTATION.',
    points: [
      'Chỉ thu thập các thông tin cần thiết để tạo tài khoản, xác thực đăng nhập, cung cấp khóa học và vận hành dịch vụ.',
      'Thông tin cá nhân không được chia sẻ cho bên thứ ba ngoài phạm vi phục vụ hệ thống, hỗ trợ kỹ thuật hoặc nghĩa vụ pháp lý cần thiết.',
      'Dữ liệu truy cập, lịch sử học tập và log giao dịch có thể được lưu để nâng cao bảo mật, hỗ trợ khắc phục sự cố và cải thiện trải nghiệm.'
    ]
  },
  {
    id: 'su-dung',
    title: 'Điều khoản sử dụng',
    summary:
      'Người dùng cần tuân thủ quy định sử dụng tài khoản, nội dung học tập và tài nguyên số được cấp trong nền tảng.',
    points: [
      'Tài khoản là tài sản cá nhân; không chia sẻ trái phép thông tin đăng nhập hoặc chuyển nhượng quyền truy cập khi chưa được chấp thuận.',
      'Không sao chép, phát tán lại khóa học, workflow, tài liệu hoặc phần mềm nội bộ nếu chưa có sự đồng ý từ 3HSTATION.',
      'Mọi hành vi gây gián đoạn hệ thống, lạm dụng API, gian lận thanh toán hoặc sử dụng dịch vụ cho mục đích trái pháp luật đều có thể bị khóa tài khoản.'
    ]
  },
  {
    id: 'thanh-toan',
    title: 'Thanh toán và số dư',
    summary:
      'Làm rõ cách nạp tiền, ghi nhận số dư và nguyên tắc sử dụng số dư cho dịch vụ số trong hệ thống.',
    points: [
      'Số dư được ghi nhận theo giao dịch thành công và có thể dùng cho các dịch vụ được hỗ trợ trên nền tảng.',
      'Người dùng cần kiểm tra đúng nội dung chuyển khoản, mã giao dịch hoặc thông tin thanh toán để hệ thống đối soát chính xác.',
      'Trong trường hợp phát sinh chậm trễ đồng bộ, đội ngũ hỗ trợ sẽ tiếp nhận và xác minh theo thông tin giao dịch người dùng cung cấp.'
    ]
  },
  {
    id: 'hoan-tien',
    title: 'Hoàn tiền và xử lý sự cố',
    summary:
      'Chính sách hoàn tiền được xem xét theo loại dịch vụ, trạng thái sử dụng và nguyên nhân phát sinh vấn đề.',
    points: [
      'Các sản phẩm số đã cấp quyền truy cập hoặc đã bàn giao có thể không thuộc phạm vi hoàn tiền tự động.',
      'Yêu cầu hoàn tiền hoặc bù trừ dịch vụ sẽ được xem xét dựa trên bằng chứng giao dịch, lịch sử sử dụng và phạm vi lỗi thực tế.',
      'Nếu sự cố đến từ hệ thống, 3HSTATION ưu tiên phương án khắc phục, bù thời gian sử dụng hoặc hỗ trợ chuyển đổi dịch vụ phù hợp.'
    ]
  },
  {
    id: 'ho-tro',
    title: 'Hỗ trợ khách hàng',
    summary:
      'Cam kết tiếp nhận yêu cầu rõ ràng, phản hồi đúng ngữ cảnh và hỗ trợ người dùng đi đến bước xử lý tiếp theo.',
    points: [
      'Người dùng nên cung cấp mã tài khoản, ảnh chụp lỗi, mã đơn hoặc tên dịch vụ để rút ngắn thời gian xử lý.',
      'Những yêu cầu vượt ngoài phạm vi hỗ trợ cơ bản sẽ được phân loại để chuyển cho đúng bộ phận chuyên môn.',
      '3HSTATION có thể cập nhật quy trình hỗ trợ theo từng giai đoạn vận hành nhằm đảm bảo chất lượng tiếp nhận.'
    ]
  }
];

const supportHighlights = [
  'Ưu tiên hỗ trợ các lỗi ảnh hưởng trực tiếp tới truy cập, thanh toán và vận hành dịch vụ.',
  'Khuyến khích người dùng mô tả rõ ngữ cảnh, thời điểm phát sinh và ảnh chụp màn hình khi gửi yêu cầu.',
  'Chính sách có thể được cập nhật để phù hợp với thay đổi sản phẩm, quy trình nội bộ hoặc yêu cầu pháp lý.'
];

module.exports = {
  supportEmail,
  faqItems,
  policySections,
  supportHighlights
};
