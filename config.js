/* CẤU HÌNH ĐĂNG NHẬP ONLINE (Supabase).
   Để trống cả hai dòng: web chạy kiểu cũ, hồ sơ lưu trên từng máy.
   Điền cả hai: học viên đăng nhập bằng email + mật khẩu, tiến độ đồng bộ giữa các máy.

   CHỈ dùng "Publishable key" (bắt đầu bằng sb_publishable_).
   TUYỆT ĐỐI KHÔNG dán "Secret key" (sb_secret_) hay khóa service_role vào đây:
   file này ai cũng đọc được, lộ secret key là lộ toàn bộ dữ liệu. */
window.PAMOS_CONFIG = {
  supabaseUrl: "",   // ví dụ: "https://gyjmxgxbjupkigcfseqh.supabase.co"
  supabaseKey: ""    // ví dụ: "sb_publishable_VJihOCFHGiZ_nRNT1tR02Q_peHuOkt0"
};
