# 🏨 KANT Hotel Management System

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-gold)
![.NET](https://img.shields.io/badge/.NET-10.0-512BD4)
![React](https://img.shields.io/badge/React-19-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)
![SQL Server](https://img.shields.io/badge/SQL%20Server-2019+-CC2927)
![License](https://img.shields.io/badge/license-MIT-green)

**Hệ thống quản lý khách sạn toàn diện — Full-Stack ERP**

*Đồ án ứng dụng WEB · Đại học Lạc Hồng · Khoa CNTT · Lớp 23CT111*

</div>

---

## 📖 Giới thiệu

**KANT Hotel Management System** là hệ thống ERP quản lý khách sạn theo kiến trúc Full-Stack hiện đại, bao gồm:

- 🖥️ **Backend**: ASP.NET Core Web API (.NET 10) — 28 Controllers, 29 Services
- ⚛️ **Frontend**: React 19 + Vite + TypeScript — 34 trang UI
- 🗄️ **Database**: Microsoft SQL Server — 33 bảng
- 🔌 **Realtime**: SignalR WebSocket — Thông báo tức thì

Hệ thống phục vụ 3 phân hệ: **Khách hàng** · **Nhân viên** · **Quản trị viên**

---

## ✨ Tính năng nổi bật

| Module | Mô tả |
|---|---|
| 🔐 **RBAC động** | JWT + Refresh Token, phân quyền chi tiết theo Permission (không theo Role cứng) |
| 📅 **Đặt phòng** | Tìm kiếm, đặt phòng, áp voucher, thanh toán đặt cọc MoMo |
| 💳 **Hóa đơn thông minh** | Tự động tính tiền phòng + dịch vụ + đền bù hỏng hóc + VAT 10% - voucher - cọc |
| 🔔 **Realtime SignalR** | Push notification cho từng role khi có booking/dịch vụ mới |
| 📊 **Analytics** | Biểu đồ doanh thu 30 ngày, RevPAR, ADR, tỷ lệ lấp đầy |
| 🛎️ **Dịch vụ phòng** | Khách gọi dịch vụ → nhân viên nhận & xử lý realtime |
| 🏆 **Loyalty Points** | Tích điểm tự động sau thanh toán, nâng hạng thành viên |
| 📦 **Import Excel** | Nhập hàng loạt vật tư thiết bị từ file .xlsx |
| 🔧 **Báo hỏng hóc** | Ghi nhận thiệt hại, tự động trừ vào hóa đơn checkout |
| 📜 **Audit Log** | Ghi lại toàn bộ hành động hệ thống, xuất JSON |
| 🌐 **CMS** | Quản lý tin tức, điểm tham quan, tiện nghi khách sạn |
| 📧 **Email** | Quên mật khẩu, xác nhận booking, trả lời liên hệ |

---

## 🏗️ Kiến trúc hệ thống

```
Hotel-Project/
├── Back_end/                    # ASP.NET Core Web API
│   ├── Controllers/             # 28 API Controllers
│   ├── Services/                # 29 Business Logic Services
│   ├── Models/                  # 33 Entity Models
│   ├── DTOs/                    # Data Transfer Objects
│   ├── Data/                    # DbContext, Seeders, Schema Initializers
│   ├── Hubs/                    # SignalR NotificationHub
│   ├── Middleware/              # PermissionMiddleware, ExceptionMiddleware
│   ├── Configurations/          # MoMo, Email, Cloudinary configs
│   └── sql/DBHotel.sql          # Script khởi tạo database đầy đủ
│
└── Front_end/                   # React + Vite + TypeScript
    └── src/
        ├── pages/
        │   ├── public/          # Trang khách hàng (Home, Rooms, Booking...)
        │   ├── admin/           # 19 trang quản trị
        │   ├── staff/           # Staff Portal (Booking, Invoice, Cleaning...)
        │   └── auth/            # Login, Register, Forgot Password
        ├── layouts/             # AdminLayout, StaffLayout, MainLayout
        ├── store/               # Redux Toolkit (auth, notifications)
        ├── services/            # Axios API services
        ├── utils/               # authNavigation, canAccessPath
        └── routes/              # ProtectedRoute theo Permission
```

---

## 🛠️ Công nghệ sử dụng

### Backend
| Công nghệ | Phiên bản | Mục đích |
|---|---|---|
| ASP.NET Core | .NET 10 | Web API Framework |
| Entity Framework Core | 9.x | ORM |
| SQL Server | 2019+ | Database |
| SignalR | — | Realtime Notification |
| JWT Bearer | — | Authentication |
| BCrypt.Net-Next | — | Password Hashing |
| Cloudinary SDK | — | Image Storage |
| MoMo Payment API | — | Payment Gateway |
| MemoryCache | — | Server-side Caching |
| Swagger / OpenAPI | — | API Documentation |

### Frontend
| Công nghệ | Phiên bản | Mục đích |
|---|---|---|
| React | 19 | UI Framework |
| Vite | 6.x | Build Tool |
| TypeScript | 5.x | Type Safety |
| Redux Toolkit | — | State Management |
| React Router | v7 | Client-side Routing |
| Ant Design | 5.x | UI Components |
| Framer Motion | — | Animations |
| Recharts | — | Analytics Charts |
| i18next | — | Đa ngôn ngữ (VI/EN) |
| Axios | — | HTTP Client |

---

## 🚀 Hướng dẫn cài đặt

### Yêu cầu hệ thống
- ✅ **.NET SDK 10.0** trở lên
- ✅ **Node.js 18.x** trở lên + npm
- ✅ **SQL Server 2019** trở lên (hoặc SQL Server Express)
- ✅ **SQL Server Management Studio (SSMS)** để chạy script

---

### Bước 1 — Clone dự án

```bash
git clone https://github.com/Nam1414/Hotel-Project.git
cd Hotel-Project
```

---

### Bước 2 — Khởi tạo Database

1. Mở **SSMS**, kết nối tới SQL Server instance của bạn
2. Mở file `Back_end/sql/DBHotel.sql`
3. Nhấn **Execute (F5)** để chạy toàn bộ script
4. Kiểm tra database `HotelManagementDB` đã xuất hiện

> ⚠️ Script đã bao gồm: tạo bảng, dữ liệu mẫu, roles, permissions, tài khoản admin.

---

### Bước 3 — Cấu hình Backend (`appsettings.json`)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=.;Database=HotelManagementDB;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "JwtSettings": {
    "Secret": "your-super-secret-key-minimum-32-characters!!",
    "Issuer": "HotelManagementAPI",
    "Audience": "HotelManagementClient",
    "ExpiryMinutes": 60
  },
  "Cloudinary": {
    "CloudName": "your-cloud-name",
    "ApiKey": "your-api-key",
    "ApiSecret": "your-api-secret"
  },
  "MoMo": {
    "PartnerCode": "your-partner-code",
    "AccessKey": "your-access-key",
    "SecretKey": "your-secret-key",
    "PaymentUrl": "https://test-payment.momo.vn/v2/gateway/api/create",
    "ReturnUrl": "http://localhost:5173",
    "NotifyUrl": "https://your-ngrok-url/api/invoices/momo-notify"
  },
  "EmailSettings": {
    "SmtpHost": "smtp.gmail.com",
    "SmtpPort": 587,
    "SenderEmail": "your-email@gmail.com",
    "SenderPassword": "your-gmail-app-password"
  }
}
```

> 💡 Với môi trường **demo/test**, chỉ cần cấu hình `ConnectionStrings` là đủ. Các tính năng Cloudinary, MoMo, Email là tùy chọn.

---

### Bước 4 — Chạy Backend

```bash
cd Back_end
dotnet restore
dotnet run
```

- Backend: `http://localhost:5052`
- Swagger UI: `http://localhost:5052` (truy cập trực tiếp root)

---

### Bước 5 — Chạy Frontend

```bash
cd Front_end
npm install
npm run dev
```

- Frontend: `http://localhost:5173`

---

## 🔑 Tài khoản Demo

> Dữ liệu mẫu được seed tự động khi backend khởi động lần đầu (môi trường Development).

### Tài khoản hệ thống (có trong `DBHotel.sql`)

| Vai trò | Email | Mật khẩu | Quyền truy cập |
|---|---|---|---|
| **Admin** | `admin@hotel.com` | `Admin@123` | Toàn quyền hệ thống |
| **Manager** | `hunglm@vaa.edu.vn` | `Hieu@1234` | Quản lý vận hành |
| **Receptionist** | `manhung08062@gmail.com` | `Hung@1234` | Đặt phòng, Check-in/out |
| **Accountant** | `nguyenbinhan2707@gmail.com` | `Binh@1234` | Hóa đơn, Thanh toán |
| **Housekeeping** | `dainguyen1254@gmail.com` | `Nguyen@1234` | Dọn phòng, Dịch vụ |

### Tài khoản khách hàng Demo (seeded tự động)

| Vai trò | Email | Mật khẩu | Ghi chú |
|---|---|---|---|
| **Guest** | `demo.traveler@hotel.local` | `Demo@123` | Có booking đã checkout |
| **Guest** | `demo.family@hotel.local` | `Demo@123` | Đang check-in |
| **Guest** | `demo.business@hotel.local` | `Demo@123` | Booking sắp tới |

> ⚠️ **Lưu ý**: Nếu mật khẩu tài khoản Staff không đúng (do hash mới), hãy dùng tính năng **Quản lý người dùng** trong Admin Panel để reset mật khẩu, hoặc tạo tài khoản Staff mới và gán role phù hợp.

---

## 🧪 Hướng dẫn kiểm thử chức năng

### 1. 👤 Luồng Khách hàng

#### Đăng ký & Đăng nhập
1. Truy cập `http://localhost:5173`
2. Click **Đăng ký** → Điền thông tin → Submit
3. Đăng nhập với tài khoản vừa tạo

#### Đặt phòng
1. Vào menu **Phòng** → Chọn một loại phòng
2. Click **Đặt phòng** → Chọn ngày nhận/trả phòng
3. (Tùy chọn) Nhập mã voucher: `DEMO10` hoặc `FAMILY500`
4. Xác nhận đặt phòng → Hệ thống gửi thông báo realtime

#### Gọi dịch vụ (khi đang check-in)
1. Đăng nhập tài khoản `demo.family@hotel.local` / `Demo@123`
2. Vào **Hồ sơ cá nhân** → **Lịch sử đặt phòng**
3. Chọn booking đang check-in → **Gọi dịch vụ**

---

### 2. 🧑‍💼 Luồng Nhân viên (Staff Portal)

Truy cập: `http://localhost:5173/staff`

#### Test tài khoản Receptionist (Lễ tân)
1. Đăng nhập: `manhung08062@gmail.com` / `Hung@1234`
2. Vào **Quản lý Đặt phòng** → Xem danh sách booking
3. **Check-in**: Tìm booking trạng thái `Confirmed` → Click **Check-in**
4. **Check-out**: Tìm booking trạng thái `CheckedIn` → Click **Check-out**
5. Vào **Hóa đơn** → Tạo thanh toán cho booking đã check-out

#### Test tài khoản Housekeeping (Buồng phòng)
1. Đăng nhập: `dainguyen1254@gmail.com` / `Nguyen@1234`
2. Vào **Dọn phòng** → Xem danh sách phòng cần dọn
3. Click cập nhật trạng thái phòng: `Dirty` → `Cleaning` → `Clean`
4. Vào **Đơn dịch vụ** → Xem và xử lý đơn dịch vụ phòng

#### Test tài khoản Accountant (Kế toán)
1. Đăng nhập: `nguyenbinhan2707@gmail.com` / `Binh@1234`
2. Vào **Hóa đơn** → Xem danh sách hóa đơn
3. Chọn hóa đơn → **Tạo thanh toán** (Tiền mặt / Chuyển khoản)
4. In hóa đơn PDF

---

### 3. 👑 Luồng Quản trị viên (Admin Panel)

Truy cập: `http://localhost:5173/admin`  
Tài khoản: `admin@hotel.com` / `Admin@123`

#### Dashboard & Analytics
1. Vào **Bảng điều khiển** → Xem tổng quan: phòng trống, doanh thu, khách hàng mới
2. Vào **Thống kê** → Xem biểu đồ doanh thu 30 ngày, RevPAR, ADR
3. Click **Xuất báo cáo CSV** để tải file

#### Quản lý Phòng
1. Vào **Phòng** → **Quản lý phòng** → Tạo phòng mới hoặc tạo hàng loạt
2. Vào **Hạng phòng & Ảnh** → Thêm/sửa loại phòng, upload ảnh
3. Vào **Kho vật tư** → Quản lý thiết bị, nhập Excel hàng loạt

#### Quản lý Booking
1. Vào **Đặt phòng** → Tìm kiếm, lọc theo trạng thái
2. Click vào booking → Xem chi tiết, đổi phòng, tách booking
3. Tạo booking thủ công cho khách walk-in

#### Quản lý Hóa đơn & Đền bù
1. Vào **Hóa đơn** → Xem chi tiết, thêm thanh toán
2. Vào **Hỏng hóc & Tổn thất** → Ghi nhận thiệt hại, hệ thống tự cập nhật hóa đơn

#### Phân quyền RBAC
1. Vào **Quyền & Phân quyền** → Chọn một Role (VD: Receptionist)
2. Tick/untick các permission → Lưu
3. Đăng xuất → Đăng nhập bằng tài khoản Receptionist → Kiểm tra menu đã thay đổi

#### Seed dữ liệu Demo
1. Sau khi chạy backend, gọi API:
   ```
   POST http://localhost:5052/api/Admin/seed-demo-presentation
   ```
   Hoặc dùng nút **Seed Demo** trong Admin Panel (nếu có).
Mã xác nhận thanh toán momo: http://localhost:5206/api/invoices/30/simulate-momo-success
---

## 📡 API Endpoints chính

| Nhóm | Prefix | Yêu cầu quyền |
|---|---|---|
| Auth | `/api/Auth` | Public |
| Booking | `/api/Booking` | `MANAGE_BOOKINGS` |
| Rooms | `/api/Rooms` | `MANAGE_ROOMS` |
| Room Types | `/api/RoomTypes` | `MANAGE_ROOMS` |
| Invoices | `/api/invoices` | `MANAGE_INVOICES` |
| OrderServices | `/api/OrderServices` | `MANAGE_SERVICES` hoặc `MANAGE_ROOMS` |
| Equipments | `/api/Equipments` | `MANAGE_INVENTORY` |
| LossAndDamages | `/api/LossAndDamages` | `MANAGE_INVENTORY` |
| Dashboard | `/api/Dashboard` | `VIEW_DASHBOARD` |
| AuditLogs | `/api/AuditLogs` | `MANAGE_ROLES` |
| Roles | `/api/Roles` | `MANAGE_ROLES` |
| UserManagement | `/api/UserManagement` | `MANAGE_USERS` |
| Vouchers | `/api/Vouchers` | `MANAGE_BOOKINGS` |
| Memberships | `/api/Memberships` | `MANAGE_BOOKINGS` |
| Contact | `/api/Contact` | Admin only |
| Notifications | `/api/Notifications` | Authenticated |

> 📖 Xem đầy đủ tại **Swagger UI**: `http://localhost:5052`

---

## 🗄️ Cơ sở dữ liệu

**33 bảng chính:**

```
Users, Roles, Permissions, RolePermissions
Rooms, Room_Types, Room_Images, RoomInventory, Room_Cleanings, Room_Transfer_Logs
Bookings, Booking_Details
Invoices, Payments
OrderServices, OrderServiceDetails
Equipments, Loss_And_Damages
Services, Service_Categories
Vouchers, Memberships
Reviews, Notifications, AuditLogs
Articles, ArticleCategories, Attractions, Amenities
SystemSettings, ContactMessages
```

---

## 🔐 Bảo mật

| Cơ chế | Chi tiết |
|---|---|
| **JWT** | Access Token (60 phút) + Refresh Token (7 ngày, lưu HttpOnly Cookie) |
| **RBAC Permission-based** | Mỗi API endpoint yêu cầu `[RequirePermission("...")]` cụ thể |
| **BCrypt** | Mã hóa mật khẩu với salt tự động (cost factor 11) |
| **Deny by Default** | Frontend `canAccessPath` chặn mọi route chưa được khai báo |
| **Audit Log** | Ghi lại mọi thao tác: đăng nhập, đăng nhập thất bại, CRUD |
| **CORS** | Chỉ cho phép origin `http://localhost:5173` |

---

## 📁 Luồng nghiệp vụ chính

```
Khách hàng đặt phòng → Booking (Pending)
  ↓ Admin/Receptionist xác nhận → Booking (Confirmed)
  ↓ Khách check-in → Booking (CheckedIn)
  ↓ Gọi dịch vụ / Minibar → OrderService (Pending → Delivered)
  ↓ Báo hỏng vật tư → LossAndDamage → Tự cập nhật Invoice
  ↓ Check-out → Booking (CheckedOut)
  ↓ Hệ thống tính Invoice tự động:
      + Tiền phòng (số đêm × giá)
      + Tiền dịch vụ (Delivered orders)
      + Đền bù hỏng hóc (LossAndDamages)
      + VAT 10%
      - Voucher giảm giá
      - Tiền cọc đã thanh toán
  ↓ Thanh toán: Tiền mặt / Chuyển khoản / MoMo
  ↓ In hóa đơn PDF
  ↓ Cộng điểm Loyalty → Tự nâng hạng thành viên
```

---

## 🎨 Giao diện

| Phân hệ | Mô tả |
|---|---|
| **🌐 Public** | Giao diện khách sạn sang trọng, Dark/Light mode, Glassmorphism, Animation |
| **🛡️ Admin Panel** | Dashboard đầy đủ công cụ, biểu đồ realtime, bảng dữ liệu phân trang |
| **🧑‍💼 Staff Portal** | Menu động theo quyền, tập trung tác vụ nhanh, tối ưu mobile |

---

## 📞 Thông tin nhóm

| | |
|---|---|
| **Tên dự án** | KANT Hotel Management System |
| **Trường** | Đại học Lạc Hồng |
| **Khoa** | Công nghệ Thông tin |
| **Lớp** | 23CT111 |
| **Email liên hệ** | khatong072@gmail.com |
| **GitHub** | https://github.com/Nam1414/Hotel-Project |

---

## 📄 License

Dự án phát triển phục vụ mục đích **học tập và nghiên cứu học thuật**.

---

<div align="center">

**© 2026 KANT Team · Đại học Lạc Hồng**


</div>
