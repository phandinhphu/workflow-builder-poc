Workflow Builder • UI Implementation Specification 

# **WORKFLOW BUILDER** 

**ĐẶC TẢ GIAO DIỆN & HƯỚNG DẪN TRIỂN KHAI FRONTEND** 

Tài liệu nguồn để coding agent có thể triển khai giao diện React nhất quán với mockup và đáp ứng mô hình Workflow ĐỘNG 

#### **Mục tiêu của tài liệu** 

Không chỉ mô tả “màn hình trông như thế nào”, tài liệu quy định rõ cấu trúc trang, component, trạng thái, tương tác, dữ liệu mock, validation, behavior động và acceptance criteria để agent có thể triển khai mà không phải tự suy đoán. 

Phiên bản 1.0 • 19/08/2026 

Tài liệu triển khai frontend • 19/08/2026 

Workflow Builder • UI Implementation Specification 

## **Mục lục nội dung** 

- 1. Phạm vi, nguyên tắc và thuật ngữ bắt buộc 

- 2. Baseline kỹ thuật cho frontend 

- 3. Design system và layout chuẩn 

- 4. App Shell: Sidebar, Topbar, Breadcrumb 

- 5. Route map và inventory màn hình 

- 6. Màn hình Người dùng & đồng bộ tổ chức 

- 7. Màn hình Danh sách Workflow / Template 

- 8. Modal tạo Workflow 

- 9. Workflow Detail: Thông tin, Audit & History, Runtime 

- 10. Workflow Builder / Designer 

- 11. Node Library và Trigger Library 

- 12. Khung cấu hình Node dùng chung 

- 13. Cấu hình Assignment, Approval, Review, Notification, Condition 

- 14. Cấu hình Form, HTTP Request, Data, Code/System Action 

- 15. UI bắt buộc cho tính ĐỘNG: Context, Variables, Participant, Resolver 

- 16. Validation, Test, Save, Publish, Suspend 

- 17. Runtime Monitoring chi tiết 

- 18. Trạng thái giao diện, empty/loading/error/permission 

- 19. Kiến trúc component React đề xuất 

- 20. Mock data / TypeScript contracts 

- 21. Accessibility, responsive và keyboard behavior 

- 22. Acceptance criteria & Definition of Done cho agent 

Tài liệu triển khai frontend • 19/08/2026 

Workflow Builder • UI Implementation Specification 

## **1. Phạm vi, nguyên tắc và thuật ngữ bắt buộc** 

Tài liệu này mô tả giao diện frontend cho Workflow Builder ở mức đủ chi tiết để coding agent triển khai. Giao diện phải bám sát mockup hiện có, nhưng đồng thời bổ sung những capability cần thiết để hệ thống thực sự ĐỘNG ở runtime. Khi mockup và nguyên tắc domain xung đột, ưu tiên thuật ngữ/domain trong phần này, giữ phong cách thị giác của mockup. 

### **1.1 Thuật ngữ phải dùng nhất quán** 

|**Thuật ngữ**|**Ý nghĩa trên UI**|**Không được dùng nhầm thành**|
|---|---|---|
|Workflow Definition|Bản định nghĩa quy trình: metadata, trigger,<br>participant scope, graph node/connection, form,<br>mapping, SLA.|Workflow Instance|
|Workflow Version|Snapshot bất biến của Definition khipublish.|Revision autosave đơn thuần|
|Workflow Instance|Một lần chạy được tạo bởi trigger event của một<br>Workflow Version.|Bản workflow đang được thiết kế|
|Node Definition|Cấu hình một node trên canvas.|Task runtime|
|Node/Task Execution|Lần thực thi runtime của node/task trong một<br>instance.|Node trên canvas|
|Participant|Đối tượng/người thuộc tập tham gia được resolve<br>tại runtime.|Assignee cố định|
|Workflow Context|Kho dữ liệu runtime để bind<br>input/output/condition/assignee.|Form state cục bộ|



#### **Sửa terminology từ mockup hiện tại** 

Modal “Tạo workflow instance” và header “Tạo instance” phải đổi thành “Tạo workflow” / “Thiết kế workflow”. Từ “Workflow Instance” chỉ sử dụng ở màn runtime. Nút “Dừng thực thi” trên Workflow Definition nên hiển thị “Tạm ngưng Workflow”; việc hủy một instance là action runtime riêng. 

### **1.2 “ĐỘNG” được phản ánh trên UI như thế nào** 

- Người dùng không chỉ kéo thả node; mọi input quan trọng phải có thể chọn nguồn giá trị runtime thay vì chỉ nhập hằng số. 

- Assignee/Approver phải hỗ trợ Fixed User, Role, Group và Dynamic User/Expression. 

- Workflow-level Participant Scope phải có UI cấu hình và preview kết quả resolve. 

- Human task phải hỗ trợ execution mode Single hoặc For each participant khi workflow có participant scope. 

- Condition phải chọn dữ liệu từ Context Picker và cấu hình operator/value mà không cần sửa source code. 

- Output của node phải được đặt tên, preview schema và dùng lại ở các node phía sau. 

- Form field phải có field key ổn định để map dữ liệu vào Workflow Context. 

- Validation phải phát hiện reference động bị lỗi trước khi publish. 

## **2. Baseline kỹ thuật cho frontend** 

|**Hạng mục**|**Quy địnhtriển khai**|
|---|---|
|Framework|React + TypeScript. Dùngcomponent function và hooks.|
|Routing|React Router hoặc router tươngđương; mỗi route trongmục 5phải deep-link được.|
|Data|Ở phase mock/demo: dùng mock repository/service; component không hard-code trực tiếp mảng<br>dữ liệu trong JSX.|
|State|Tách server/mock query state, designer state, modal state và runtime context preview. Có thể<br>dùngZustand/Redux Toolkit/Context tùy project, nhưngdesignergraphphải có store riêng.|
|Graph canvas|Có thể dùng React Flow hoặc thư viện graph tương đương; phải hỗ trợ node ports, edge, select,<br>pan/zoom, insertpoint.|
|Icons|Dùngmột icon librarynhấtquán(Lucide/Phosphor tươngđương). Khôngtrộn nhiều bộicon.|
|Styling|CSS Modules/Tailwind/styled system đều được, nhưng phải map qua design tokens ở mục 3.|



Tài liệu triển khai frontend • 19/08/2026 

Workflow Builder • UI Implementation Specification 

|**Hạng mục**|**Quy địnhtriển khai**|
|---|---|
|Form|Dùng controlled form hoặc React Hook Form. Validation hiển thị inline và tổng hợp ở bước “Xác<br>minh”.|
|Accessibility|Button/icon button có accessible name; modal trap focus; tabs và dropdown dùng keyboard<br>được.|



#### **Quy tắc cho coding agent** 

Không tự sáng tạo lại visual style. Ưu tiên tái sử dụng component và token; nếu mockup chưa thể hiện một trạng thái bắt buộc, triển khai trạng thái đó theo cùng ngôn ngữ thiết kế thay vì bỏ qua. 

## **3. Design system và layout chuẩn** 

### **3.1 Frame và grid** 

|**Token**|**Giá trị đề xuất**|**Ghichú**|
|---|---|---|
|Reference viewport|1440 × 1024 CSSpx|Các ảnh mockuphiện tại tươngứngframe này.|
|Sidebar width|260px|Fixed bên trái trên desktop.|
|Topbar height|68px|Từ x=260 đến mép phải.|
|Page background|#F8FAFC|Khu vực content list/detail. Builder canvas dùng gần #FBF9FF/#FAF7FF.|
|Content horizontalpadding|24px|Từ mépcontent đến card/table.|
|Content verticalpadding|24–28px|Giữa topbar vàpage heading.|
|Card radius|10–12px|Table container, toolbar,panel.|
|Control radius|6–8px|Input, button, select.|
|Modal radius|10–12px|Modal create và node editor.|



### **3.2 Màu sắc** 

|**Vai trò**|**Hex**|**Cách dùng**|
|---|---|---|
|Navy /Sidebar|#0F172A|Sidebar background, headingtext.|
|PrimaryBlue|#2563EB|Active tab,primaryaccent, selected node, links.|
|PrimaryDark|#1D4ED8|Hover/focusprimary.|
|Page BG|#F8FAFC|Background màn danh sách/detail.|
|Surface|#FFFFFF|Card, topbar, modal.|
|Border|#E2E8F0|Card/input/table divider.|
|Muted text|#64748B|Description, helper, metadata.|
|Success|#16A34A|Published, Active, Completed, On-time.|
|Danger|#DC2626|Delete, Rejected, destructive action.|
|Warning|#EA580C|SLA overdue,pause/suspend warning.|



### **3.3 Typography và spacing** 

- Font ưu tiên: Inter. Body 14 px; table/secondary 13–14 px; small metadata 12 px. 

- Page title 24 px / 700; section heading 20–22 px / 700; modal title 20–22 px / 700. 

- Button 14 px / 500–600; tab 14 px / 500, active 600 và primary blue. 

- Spacing scale chính: 4, 8, 12, 16, 20, 24, 32 px. Không tạo spacing ngẫu nhiên ngoài scale nếu không cần. 

- Table row target 54–60 px; filter toolbar 62–66 px; input/button target 36–40 px. 

Tài liệu triển khai frontend • 19/08/2026 



<!-- Start of picture text -->
is Workflow Builder Ngudi dung Nguyén Van A 3 )<br>88 Dashboar Dong b6 ngudi dung<br>BR Ngudi ding<br>l=sy Workflov 8 SAP SuccessFactors2024-12-10Dakét08:30noi Cau hinh két ndi<br>Danh sach nguéoi ding Thém ngudi diing mdi<br>Ho tén Email Phong ban Chirc vu Cp quan ly Trang thai Hanh déng<br>Nguyén Thi Mai mai.nt@ pany.com Pt Nhan s HR Specialist Staff v Active Phan quyén<br>Tran Hoang Bach bach.th@company.com Phor yngh Backend Engi Staff v Active Phan quyén<br>Lé Minh Tam ta mpany.cc Phong Kinh di ales Lead Manager v Active Phan quyén<br>Pham Hong Dang Jang.ph@company.cc Pr Ti r Chief Accountant Manager v Active Phan quyén<br>VG Ngoc Trinh trinh.vn@company.com Phong Marketing Marketing Director Director » Active Phan quyén<br>6 Hitu Chau hau.dh@company 1 Ban Giam G6: hief Executive Office C-Level v Active Phan quyén<br>Hoang Quéc Viét t.hg@company.cor Phor y nghi DevOps Special Staff v Inactive Phan quyén<br>Bui Phuong Thao thao.bp@company.com Phong Phap ch ega unse Staff v Active Phan quyén<br>(@-:><br><!-- End of picture text -->

Workflow Builder • UI Implementation Specification 

|**Route đề xuất**|**Màn hình**|**Quyền tối thiểu**|
|---|---|---|
|/workflows|Danh sách Workflow Definition|Viewer|
|/workflows/new|Create workflow flow; có thể mở modal trên/workflows|Ownerpermission|
|/workflows/:workflowId|Workflow detail - Thôngtin chi tiết|Viewer|
|/workflows/:workflowId/history|Audit & History|Viewer|
|/workflows/:workflowId/runtime|Theo dõi Runtime|Viewer|
|/workflows/:workflowId/designer|Workflow Builder/Designer|Editor/Owner|
|/workflows/:workflowId/instances/:i|Runtime Instance detail|Viewer / runtime|
|nstanceId||permission|
|/settings|Cài đặtplaceholder/connectors|Admin|



Tài liệu triển khai frontend • 19/08/2026 



<!-- Start of picture text -->
is Workflow Builder Ngudi dung Nguyén Van A 3 )<br>88 Dashboar Dong b6 ngudi dung<br>Déng bé danh sach nhan sy tir hé théng da cé vao hé th6ng Workflow Builder<br>BR Ngudi ding<br>l=sy Workflov 8 SAP SuccessFactors2024-12-10Dakét08:30noi Cau hinh két ndi<br>Danh sach nguéi dung Thém ngudi diing mdi<br>Ho tén Email Phong ban Chire vy Cap quan ly Trang thai Hanh déng<br>Nguyén Thi Mai mai.nt@company.con' Pt Nhan s HR Specialist Staff v Active Phan quyén<br>Tran Hoang Bach bach.th@company.com Phor yngh Backend Engi Staff v Active Phan quyén<br>Lé Minh Tam ta npany.cc Pr Kinh d ales Lead Manager v Active Phan quyén<br>Pham Hong Dang Jang.ph@company.cc Pr Ti r Chief Accountant Manager v Active Phan quyén<br>VG Ngoc Trinh trinh.vn@company.com Phong Marketing Marketing Director Director v Active Phan quyén<br>6 Hitu Chau hau.dh@company 1 Ban Gidm 46 hief Executive Office C-Level v Active Phan quyén<br>Hoang Quéc Viét t.hq@company.cor Phor yngh DevOps Specia' Staff v Inactive Phan quyén<br>Bui Phuong Thao thao.bp@company.com Pr Phap ch egal nse Staff v Active Phan quyén<br>(@-e:><br><!-- End of picture text -->

Workflow Builder • UI Implementation Specification 

##### **<u><mark>Cột</mark></u>** **<mark>Hiển thị</mark>** **<u><mark>/ tương tác</mark></u>** 

Trạng thái Badge Active/Inactive. Hành động Button “Phân quyền”; mở modal permission theo workflow/global scope. 

**Bổ sung cần thiết cho tính ĐỘNG** 

User detail/drawer nên hiển thị Manager hiện tại và externalSubject/externalId. Dynamic resolver “Manager of participant” cần dữ liệu managerId; UI phải cho người dùng kiểm tra được quan hệ này, dù Position chỉ là display. 

### **6.4 Pagination và states** 

- Footer trái “Hiển thị 1–8 trong tổng số … nhân viên”; phải lấy từ pagination state. 

- Footer phải có previous/next và page number. 

- Empty: icon + “Chưa có người dùng được đồng bộ”. 

- Loading: skeleton rows giữ nguyên column widths. 

- Error: inline banner ở trên table với retry. 

Tài liệu triển khai frontend • 19/08/2026 



<!-- Start of picture text -->
is Workflow Builder Workflow Nguyén VanB wo<br>8§ Dashboarc Danh sach Workflow<br>RON si Danh sach Template f<br>|& Workflows<br>87 t Q j thai: All v & Templatecua téi Tao template<br>Tén Template Loai Trang thai Ngudi tao Ngay tao Phién ban Hanh<br>déng<br>|© Phé duyét mua sam Approval Published Nguyén Van B 2024-11-01 v2 2 ||<br>(© Phé duyét nghi phép Approval Published t E A~10-1 v1.4<br>|S Phé duyét hop dng Review Suspended V 2024-09-2 v3.0<br>(© Reviewtai liéu ky thuat Review Suspended Pham Van D 2024-08-1 v1.2<br>(© Phé duyétchi phi Approval Published Nguyén Van E A-1 v2.( 2 ||<br>‘Beo><br><!-- End of picture text -->



<!-- Start of picture text -->
is Workflow Builder Workflow Nguyén VanB wo<br>88 Dashboarc Danh sach Workflow<br>AON TY) i Danh sach Workflow<br>|& Workflows<br>BSa t Q j thai: Al ¥ 2 Workflow cua t6 Tao workflow<br>Tén Template Loai Trang thai Ngudi tao Ngay tao Phién ban Hanh<br>déng<br>F Nguyén VanB . \<br>phé duyét nghi phép Running guy A-10-1 : ®<br>ae<br><!-- End of picture text -->

Workflow Builder • UI Implementation Specification 

### **7.4 Bảng Workflow Definition** 

Cùng visual với bảng Template nhưng tên cột đầu nên là “Tên Workflow”, không phải “Tên Template”. Một row đại diện cho Workflow Definition hiện tại, không phải runtime instance. 

**Sửa từ mockup** 

Row “Nguyễn Văn B – Phê duyệt nghỉ phép” hiện đang được hiểu như Workflow Definition. Không gọi row này là instance. Runtime instance chỉ xuất hiện trong tab Theo dõi Runtime. 

Tài liệu triển khai frontend • 19/08/2026 



<!-- Start of picture text -->
a See . Workflow were vee m of<br>Danh sach Workflow<br>Tao workflow instance r x<br>2 "<br>==<br>Théng tin co ban<br>. ©Tao tirWorkfiow instance tréng Template i paca ane<br>Tén workflow instance *<br>o Nguyén. Van B - Phé=eduyét nghi. phép 78<br>M6 ta<br>Loai workflow * Module<br>Approval Operations 4<br>Quyén sé hiu & Phién ban<br>Ngudi sé hiru * Phién ban<br>3 Nguyén VinB v 1.0<br>ey<br><!-- End of picture text -->

Workflow Builder • UI Implementation Specification 

### **8.4 Bổ sung Workflow Settings cho tính ĐỘNG** 

Participant Scope và Workflow Variables không nên làm modal tạo ban đầu quá nặng. Sau khi tạo, người dùng cấu hình trong “Thiết lập workflow” từ designer. Click tên workflow hoặc icon chỉnh sửa ở thanh designer mở modal/drawer gồm 3 tab: Thông tin chung, Đối tượng tham gia, Biến workflow. 

Tài liệu triển khai frontend • 19/08/2026 



<!-- Start of picture text -->
j=) Workflow Builder Workflow > Nguyén Van B Phé duyét nghi phép Nguyén Van<br>B wo<br>96 Dashboarc Quay lai Dig thye thi<br>AON 4u } Audit & History<br>|& Workflows<br>8 . Version History & Change Log = Filter<br>eo}<br>yaa (9) 2024-12-08 16:15 . 9 NguyénVan A<br>ed approver Thay déi Ngudi phé duyétCap 1 ti Lé VanC thanh Lé Minh Tam<br>e v2.0 63 2024-11-20 09:3 & NguyénThi Mai<br>Added step Thém budc anh gid rui ro an ninh cho trang thiét bi CNTT<br>e<br>vil | t 1g<br>Upd. Cp nhat han mtfc phé duyét C4p 1 lén mic 50.000.000 VND<br>e<br>v1.0<br>hoan toan k J quy trint ) mua s4m t<br><!-- End of picture text -->



<!-- Start of picture text -->
j=) Workflow Builder Workflow > Nguyén Van B Phé duyét nghi phép Nguyén Van B wo<br>96 Dashboarc Quay lai Dig thye thi<br>AN fu } Theo déi Runtime<br>|& Workflows<br>oh8 t Q F t Trang thai: All v<br>Request ID Ngudi tao yéu cau Budc hién tai Ngudi xir ly hién tai Trang thai Thdi gian bat dau SLA<br>REQ-1092 Nguyén Thj Mai Phé duyét Cap 1 Lé Minh Te Pending On-time<br>REQ-1081 Tran Hoang Bach F juyét Cap VG Ngoc Trint Pending Overdue<br>REQ-1052 Pham Hong Dang Hoan tat quy tr 4@ théng ty dong Completed On-time<br>REQ-1049 Bui Phuong Thao Phé duyét Cap 1 5M 1 Rejected On-time<br>REQ-1030 Hoang Quéc Viét Huy bé Hoang Quéc Viét Cancelled On-time<br><!-- End of picture text -->

Workflow Builder • UI Implementation Specification 

|**Cột**|**Spec**|
|---|---|
|Trạng thái|Pending/Running/Completed/<br>Rejected/Cancelled badge.|
|Thờigian bắt đầu|Datetime.|
|SLA|On-time green / Overdue red /<br>— nếu khôngápdụng.|



Search placeholder nên là “Tìm Request ID hoặc người tạo…”. Status select: All/Pending/Running/Completed/Rejected/Cancelled. Nếu đang ở detail của một workflow thì không cần filter Workflow Name. 

Tài liệu triển khai frontend • 19/08/2026 



<!-- Start of picture text -->
j=) Workflow Builder Workflow > Tao instance Nguyén Van B o<br>98 Dashbx Nguyén Van B - Phé duyét nghi phép _—ODraft Xac minh<br>RON |<br>TRIGGERS<br>(& Workflows Lua chon event kich hoat workflow<br>a<br>& Kich hoat thi céng<br>Bat dau workflow thu céng hoac goi AP<br>© Theo lich trinh<br>Chay vao cdc thdi diém cy thé, hang ngay<br>hang tun hodc theo khodng thdi gian tiy<br>© StartBat dau workflow<br>oF Khi gti biéu mau<br>Kich hoat khi ngudi dung gui mét biéu mau<br>14 két né<br>Thém Trigger eu Theo su kién Webhook<br>Kich hoat ty déng khi an dy liéu gui tu<br>ung dyng bén ngoai qua URL API<br>End<br><!-- End of picture text -->



<!-- Start of picture text -->
is Workflow Builder Workflow > Tao instance Nguyén Van B oe<br>98 Dashb« Nguyén Van B - Phé duyét nghi phép Draft Xac minh<br>PRON |<br>a Thuvién x<br>(& Workflows 0 Lyaeechon node erdé thémrete vao workflowss<br>8 NGHIEP VU<br>Phé duyét<br>© Giri yéu cau va ché phé duyéttir quan ly hoa<br>4c bén lién qua<br>(C) Start Kiém duyét<br>ndi dung trude khi tiép tu<br>Ph&n céng<br>Trigger © _ Giao nhiémvu hoac hd so cho<br>+. Kich hoat thu céng ddi ng hode vai trd cy thé mot ngudi dung<br>Click 48 thyc thi<br>Théng bao<br>© Gui théng bao tu ddng (Email, in-app, Slack)<br>dén cdc ngudi lién quan<br>: dia @ cor .Ldé1<br>© Méhye code:thi doan ma JS/TS ty chink<br>D) End<br>pe Bang«Bang d@ dale liéu<br>ruy van va xirly dir ligu c6 cau tra<br>& HTTP Request<br>~  Giti yéu cau gol API bén ngoai<br>1) Biéu mau<br>Yéu cau ngudiding nhap théng tin qua giao diér<br>3+ DIEU KHIEN LUONG XU LY<br><!-- End of picture text -->

Workflow Builder • UI Implementation Specification 

- Sau mỗi node có insert handle “+”. Click mở Node Library. Có thể drag node từ library vào canvas nếu thư viện hỗ trợ. 

- Node selected có border primary 2 px và handles/ports. Node hover hiển thị menu ba chấm. 

- Connection line mặc định slate; selected blue. Condition output phải có label TRUE/FALSE hoặc nhánh đặt tên. 

- Canvas hỗ trợ pan bằng drag nền, zoom wheel/controls; có “Fit view” nếu graph dài. 

- Không cho edge nối vào Start hoặc edge đi ra từ End. Không cho dangling edge khi publish. 

### **10.4 Node card visual** 

- Width 240–260 px, white surface, 1 px border, radius 8 px. 

- Header node: icon block, node type label nhỏ, node name bold. 

- Body optional: summary configuration (ví dụ “Manager of participant”, “Email + In-app”, expression rút gọn). 

- Footer/secondary row có quick hint/action nếu cần. 

- State markers: invalid red outline/icon, unsaved dot, disabled opacity, selected blue. 

## **11. Node Library và Trigger Library** 

### **11.1 Trigger Library** 

|**Trigger**|**Mô tả UI**|**Sau khichọn**|
|---|---|---|
|Kích hoạt thủ công|Bắt đầu từ người dùng hoặc API manual action.|Mở trigger config: input schema + permissions/API<br>option.|
|Theo lịch trình|Theo thời điểm/recurrence.|Mở schedule editor: frequency/time/timezone.|
|Khigửi biểu mẫu|Form submission kích hoạt instance.|Chọn Form Definition hoặc inline trigger form.|
|Theo sựkiện Webhook|Nhận event/payload từ hệthốngngoài.|Mở endpoint/security/schemapreview.|



### **11.2 Node Library** 

Panel header “Thư viện”, helper “Lựa chọn node để thêm vào workflow”, close X. Nhóm node theo capability. Search node nên được bổ sung nếu danh mục tăng. 

|**Nhóm**<br>|**Node tối thiểu**|
|---|---|
|NGHIỆP VỤ|Phê duyệt, Kiểm duyệt/Review, Phân công, Thôngbáo|
|CỐT LÕI|Mã code, Bảngdữ liệu/Data, HTTP Request, Biểu mẫu|
|ĐIỀU KHIỂN LUỒNG XỬ LÝ|Điều kiện(IF/ELSE); có thể mở rộngDelay/Wait, Parallel sau này.|



#### **Nguyên tắc ĐỘNG** 

Node Library chỉ chứa primitive/capability generic. Không thêm node mang tên một nghiệp vụ cụ thể của tổ chức. Nghiệp vụ được tạo bằng configuration và connection. 

Tài liệu triển khai frontend • 19/08/2026 



<!-- Start of picture text -->
wore tne Teo instance gaytn van 8 wv<br>© Phancéng ® x | is |<br>PHANCONG  - Giao nhiém vy hoac hd so cho mét ngudi ding, déi ngi hoac vai tro cy thé<br>Dé liéu dau vao Xem truéc két qua<br>Cau hinh ngu6i nhan<br>Sa Loai ngudi nhan<br>Ngudi cy thé, hoac vai tro<br>Chi tiét cong viéc<br>Tiéu dé cong viéc<br>Tiéu dé cong viéc<br>Kénh théng bao<br>© Email « ral In-app<br>ee<br><!-- End of picture text -->



<!-- Start of picture text -->
wwe » Teo instance wee vee oF<br>© Phan c6n 9 @5) x | tow |<br>PHAN CONG Giao nhiém vy hoac hd so cho mét ngudi dung, d6i ngG hoac vai tro cy thé<br>Dé liéu dau vac Xem truéc két qua<br>Cau hinh nguéi nhan<br>—— Loai ngudi nhan<br>Ngudi cy thé, hodc vai trd y<br>Chi tiét céng viéc<br>Tiéu dé céng viéc<br>Tiéu dé cong viéc<br>Kénh théng bao<br>Email «> al In-app<br>> Ody emtn ome 8<br><!-- End of picture text -->



<!-- Start of picture text -->
were Teo instance even vee B<br>© ye @ x<br>PHE DUYET a<br>DO liéu dau vao Xem truéc két qua<br>Cau hinh ngw0i phé duyét<br>Cau tric<br>Loai ngudi phé duyét<br>Ngudi phé duyét da xac dinh<br>Ngudi cy thé, vai tro, hodc ngudi ding déng .<br>|<br>Chientiét yéu cau Du kién SLA<br>Tiéu dé yéu cau Da giao None<br>a N<br>M6 ta yéu cau huyér ar N<br>Ty déng t N<br>Dau ra cla Node<br>® D4 phé duyét<br>®@ Da ti cho<br>SLA& Chuyén cap Thiét lap han chét phé duyét @)<br>Han sau<br>} rT 5 gid 24 git<br>Quy tc chuyén cap | Xie ly khi qué han<br>PP Oty ents —.<br><!-- End of picture text -->



<!-- Start of picture text -->
wowtee » Teo instance apuytn van8 eo of<br>© Théng9 bao @3 x Ls tw |<br>THONG BAO. 3tri théngbdo tydéng (Ema apr ack) d&n cdc ngudi lién quar<br>DG liéu dau vao Xem trudc két qua<br>Cau hinh nguéi nhan<br>CAu trie<br>—— Loai ngudi nhan<br>Ngudi cy thé, hoac vai tro<br>NGi dung théng bao<br>h | j he<br>Kénh théng bao<br>© emai «@ QQ n-app<br>Fy Teams &  Webhook<br>> fvend= —.<br><!-- End of picture text -->



<!-- Start of picture text -->
wowwee » Teo instance even vee B<br>© DieuDIEU KIEN kién(IF / ELSE) @G xX | sis |<br>DG liéu dau vao Cau hinh quy tac Xem tru@c két qua<br>¢ truc IN<br>Két qua cudi clung<br>» © Get Test Scores 1 ($scores.t1 + $scores.t2 + $scores.t3) / 3<br>{} body.scores © TRUE ’<br>is greater than 70<br>"1 80 NUM<br>12 75 NUM ee Cac buséc kiém tra<br>3 SoM [Get Candidate]. status equals Condition; 1<br>»v & Get Candidate ACTIVE sas<br>d “co01" (80 + 75 + 85) /3= 80<br>asc status "ACTIVE" sT + Thém diéu kién = {} Thém nhom aia ats<br>80>70>t<br>@ Thém nhém HOAC<br>Condition 2<br>status ‘ACTIVE<br>parisor<br>ACTIVE" == "ACTIVE" » true<br>ie<br><!-- End of picture text -->

Workflow Builder • UI Implementation Specification 

## **14. Cấu hình Form, HTTP Request, Data, Code/System Action** 

### **14.1 Form Node / Form Definition** 

Form là capability bắt buộc để human task có thể thu dữ liệu mà không hard-code giao diện theo nghiệp vụ. Có thể triển khai Form Node riêng và/hoặc inline form trong Assignment/Review/Approval; cả hai phải dùng cùng Form Builder component. 

|**Khu vực**|**Spec**|
|---|---|
|Fieldpalette|Text, Textarea, Number, Date, Select, Radio, Checkbox, User Picker, File(mock nếu chưa backend).|
|Canvas form|Danh sách field reorder drag/drop; field selected mở config.|
|Field config|Label, stable key, type, required,placeholder, default source, options source, validation.|
|Dynamic default/options|Nguồn từ Constant/Workflow Context/HTTP/Data output.|
|Submit mapping|Mapform values vào node output keys;previewJSON schema.|



### **14.2 HTTP Request** 

|**Field**|**Spec**|
|---|---|
|Connection|Chọn connector/base URL đã cấu hình hoặc custom mock.|
|Method + URL|GET/POST/PUT/PATCH/DELETE; URL hỗ trợvariable token.|
|Headers/Query/Body|Key-value editor; value dùngDynamic Value Picker. Secret hiển thịmasked.|
|Auth|Reference credential/connection, khôngnhậpsecretplain text vào Definition UI.|
|Response mapping|Preview response sample; map JSONpath sangoutput keys.|
|Test|“Kiểm tra cấu hình” chạymock/test service; show status, latency, response.|



### **14.3 Data / Bảng dữ liệu** 

Node generic cho query/transform dữ liệu có cấu trúc. UI tối thiểu: chọn source/table/dataset mock, filter rules, select fields, sort/limit, preview rows, output schema. Không hard-code entity nghiệp vụ. 

### **14.4 Code** 

Advanced node cho JS/TS expression/script. Editor monospaced, input bindings, output contract, timeout/limit note, test sample. Trong demo frontend có thể mock execute. Code node là escape hatch, không phải cách mặc định để cấu hình condition/business flow. 

Tài liệu triển khai frontend • 19/08/2026 

Workflow Builder • UI Implementation Specification 

## **15. UI bắt buộc cho tính ĐỘNG: Context, Variables, Participant,** 

## **Resolver** 

#### **Đây là phần trọng tâm của toàn bộ frontend** 

Nếu agent chỉ triển khai các mockup hiện tại mà không có các component dưới đây thì sản phẩm vẫn mới chỉ là workflow editor tĩnh. Tính ĐỘNG phải trở thành primitive UI có thể tái sử dụng ở mọi node. 

### **15.1 Dynamic Value Picker** 

Mọi field có khả năng nhận runtime data cần nút/chip “fx / Chèn dữ liệu”. Khi bấm mở popover hoặc side panel chọn nguồn giá trị. 

|**Source type**|**Ví dụ hiển thị**|
|---|---|
|Constant|“50,000,000”, “ACTIVE”, text literal.|
|Trigger|trigger.body.employeeId|
|Workflow Variable|workflow.period, workflow.threshold|
|Participant|participant.id,participant.departmentId,participant.managerId|
|Current User|currentUser.id|
|Node Output|Get Candidate → output.status|
|Expression|(scores.t1 + scores.t2 + scores.t3) /3|



- Selected dynamic value render thành chip/token, không render như plain text khó phân biệt. 

- Hover chip có tooltip source + resolved sample. 

- Broken reference có red border/icon và xuất hiện trong Validation Panel. 

- Picker có search theo node/field, breadcrumb tree và data type. 

### **15.2 Workflow Context Explorer** 

Trigger └─ body.employeeId : string Workflow Variables `├` ─ period : string 

└─ threshold : number Participant `├` ─ id : string └─ managerId : string Previous Nodes └─ Get Candidate `├` ─ output.id : string 

└─ output.status : string 

Context Explorer là component dùng chung cho modal node, condition, form default, HTTP mapping và test runner. Tree chỉ hiển thị nguồn hợp lệ theo vị trí node và graph dependency. 

### **15.3 Participant Scope - Workflow Settings** 

|**Control**|**Spec**|
|---|---|
|Enableparticipants|Toggle “Workflow có tậpđối tượngthamgia”.|
|Selector type|Tất cả user active / Nhóm / Vai trò / Phòng ban / Điều kiện tổ chức / Dynamic expression / External|
||query.|
|Criteria|Form thayđổi theo selector type.|
|Snapshotpolicy|Mặc định “Chốt danh sách khi instance bắt đầu”. Advanced option nếu sau nàyhỗ trợdynamic refresh.|
|Preview|Button “Xem trước” trả danh sách mẫu + count; warningnếu 0.|
|Participant key|Canonical runtime alias =participant; hiển thịcho variablepicker.|



Tài liệu triển khai frontend • 19/08/2026 

Workflow Builder • UI Implementation Specification 

### **15.4 Assignee / Approver Resolver component** 

|**Resolver type**|**UI cấu hình**|
|---|---|
|Fixed User|Search userpicker.|
|Role|Role select + optional scope.|
|Group|Group/team select.|
|Current Participant|Khôngcần field thêm; chỉ valid trong participant execution.|
|Manager of Participant|Resolveparticipant.managerId;preview sample.|
|Dynamic User|Chọn variable/expression trả userId hoặc list userIds.|



### **15.5 Execution mode** 

Trong Human Task modal, ngay dưới resolver có “Execution mode”. 

Execution mode ○ Single task 

● For each participant 

Completion policy 

● All tasks completed 

○ Any task completed 

○ At least [ 80 ] % 

Phiên bản MVP có thể chỉ enable “All tasks completed”; các option khác có thể disabled với tooltip “Chưa hỗ trợ”. Quan trọng là data model/UI không giả định 1 node = 1 task. 

### **15.6 Workflow Variables** 

Workflow Settings > Biến workflow: table gồm Key, Type, Default value/source, Required, Description, Delete. Key ổn định, không trùng; không cho đổi key tùy ý khi đã được reference mà không warning. Variable xuất hiện trong Context Picker. 

Tài liệu triển khai frontend • 19/08/2026 

Workflow Builder • UI Implementation Specification 

## **16. Validation, Test, Save, Publish, Suspend** 

### **16.1 Lưu Draft** 

- Lưu không yêu cầu workflow executable hoàn toàn; cho phép draft incomplete. 

- Sau save hiển thị “Đã lưu lúc HH:mm” hoặc toast. 

- Unsaved changes marker ở toolbar/title; navigation away prompt nếu chưa lưu. 

### **16.2 Xác minh / Validation Panel** 

|**Category**|**Blocking examples**|
|---|---|
|Graph|Thiếu Start/End, node orphan, edge invalid, condition branch chưa nối.|
|Trigger|Chưa có trigger, schedule/webhook configthiếu.|
|Node config|Required field thiếu, resolver khônghợplệ, notification khôngcó channel.|
|Dynamic reference|Variable/node output bịxóa hoặc sai type.|
|Form|Field keytrùng, required mappingthiếu.|
|HTTP/System Action|URL/action/connection thiếu, output mappinglỗi.|
|Permission|Owner/actor khôngcóquyềnpublish.|



Validation Panel nên là drawer phải 380–420 px hoặc modal nhỏ. Group Error/Warning. Click item → focus node/field tương ứng. Toolbar “Xuất bản” chỉ enable khi không còn blocking error. 

### **16.3 Kiểm thử** 

- Mở test runner drawer/modal với Sample Trigger Payload, Workflow Variables, Participant sample. 

- Cho user nhập test context và chạy preview từng node hoặc whole-path simulation ở frontend mock. 

- Kết quả hiển thị node sequence, resolved assignee, condition result, rendered message/request. 

- Không tạo runtime instance production. 

### **16.4 Publish** 

- Click mở confirmation: version sắp publish, summary validation, note published version immutable. 

- Confirm → mock service tạo version snapshot; status Published; redirect/detail hoặc giữ designer read-only tùy permission. 

- Nếu chỉnh Published workflow, tạo Draft version mới thay vì mutate snapshot. 

### **16.5 Suspend** 

Action “Tạm ngưng Workflow” ở detail. Confirmation phải nói rõ: ngừng nhận trigger mới; không mặc định hủy instance đang chạy. Sau suspend badge “Suspended”, action đổi thành “Kích hoạt lại”. 

## **17. Runtime Monitoring chi tiết** 

### **17.1 Instance Detail page** 

Ngoài runtime list trong mockup, agent nên triển khai route/detail skeleton để execution model không bị cụt. Màn này có thể là phase tiếp theo nhưng component contract nên có từ đầu. 

|**Section**|**Nội dung**|
|---|---|
|Header|Instance code, workflow name/version, status, started time, creator, Cancel action theoquyền.|
|Graph|Read-only graph của version đã chạy; node highlight Pending/Running/Completed/Rejected/Failed.|
|Active tasks|Assignee/resolver result,participant, due date/SLA, task status.|
|Participants|Nếu cóparticipant scope: listparticipant +progress; filter/search.|
|Timeline|Trigger received → node started → task assigned → submitted/approved → route → completed.|
|Context|Read-only JSON/tree có masking; chỉ user cóquyền mới xem.|



Tài liệu triển khai frontend • 19/08/2026 

Workflow Builder • UI Implementation Specification 

### **17.2 Runtime list khi nhiều task active** 

- “Người xử lý hiện tại” không ép về một user. Nếu N active assignees: hiển thị “N người”/“N tác vụ” và popover preview. 

- “Bước hiện tại” nếu nhiều branches/tasks: hiển thị bước chính + “+N”. 

- SLA row-level có thể tính worst active task; tooltip giải thích. 

Tài liệu triển khai frontend • 19/08/2026 

Workflow Builder • UI Implementation Specification 

## **18. Trạng thái giao diện: empty, loading, error, permission** 

|**State**|**Quy địnhchung**<br>|
|---|---|
|Loading page|Skeleton title/filter/table; khôngnhấpnháylayout.|
|Loadingaction|Spinner trongbutton + disable double click.|
|Emptylist|Illustration/icon nhẹ+ title + helper + create CTA nếu cóquyền.|
|No search result|“Khôngtìm thấykếtquả” + clear filters.|
|Errorpage/data|Inline alert hoặc error state với retry; khôngchỉ console.error.|
|Validation error|Inline dưới field + red border; tổnghợptrongValidation Panel.|
|Unauthorized|Hide destructive/create action hoặc disabled với tooltip theo product policy; route unauthorized có 403<br>state.|
|Confirm destructive|Delete/Cancel/Suspendphải confirmation modal;primarydestructive red.|
|Toast|Success save/create/publish; error actionable; auto-dismiss ~4–6s.|



### **18.1 Delete Workflow rule trên UI** 

Delete icon/button chỉ active khi rule backend/mock cho phép. Nếu workflow đang có instance chạy hoặc đã được sử dụng theo policy, disabled và tooltip nêu lý do. Delete dùng soft-delete behavior trong mock model; không biến mất khỏi audit ngay lập tức nếu product có view Deleted. 

## **19. Kiến trúc component React đề xuất** 

AppShell 

`├` ─ Sidebar 

`├` ─ Topbar 

└─ Outlet 

WorkflowDesignerPage 

`├` ─ DesignerToolbar 

`├` ─ WorkflowCanvas 

│ `├` ─ StartNode 

│ `├` ─ TriggerNode 

│ `├` ─ GenericWorkflowNode 

│ `├` ─ ConditionNode 

│  └─ EndNode 

`├` ─ TriggerLibraryPanel 

`├` ─ NodeLibraryPanel 

`├` ─ NodeConfigModal 

│ `├` ─ ContextExplorer 

│ `├` ─ NodeConfigForm 

│  └─ ResultPreview 

`├` ─ WorkflowSettingsModal 

│ `├` ─ GeneralTab 

│ `├` ─ ParticipantScopeTab 

│  └─ VariablesTab 

└─ ValidationPanel 

### **19.1 Component dùng chung bắt buộc** 

**<u><mark>Component</mark></u>** **<mark>Dùng</mark>** **<u><mark>ở</mark></u>** DataTable Users, templates, workflows, runtime, participants. SearchInput / StatusSelect List pages. StatusBadge User/workflow/runtime/SLA. Modal / Drawer / ConfirmDialog Create, node config, validation, settings, destructive actions. 

Tài liệu triển khai frontend • 19/08/2026 

Workflow Builder • UI Implementation Specification 

|**Component**|**Dùng ở**|
|---|---|
|UserPicker / RolePicker /|Resolver.|
|GroupPicker||
|AssigneeResolverField|Assignment/Approval/Review/Notification/SLA escalation.|
|DynamicValueField|Condition, forms, HTTP, title/message, variable default.|
|ContextExplorer|Node config/test/condition.|
|FormBuilder|Form node + human task inline form.|
|Pagination|All list/tablepages.|
|Toast|Global feedback.|



### **19.2 Designer store tối thiểu** 

<mark>designerState = {</mark> workflowId, draftVersion, nodes: NodeDefinition[], edges: ConnectionDefinition[], trigger, participantScope, variables, selectedNodeId, dirty, validationIssues, panel: "none" | "node-library" | "trigger-library" | "validation" <u>}</u> 

Tài liệu triển khai frontend • 19/08/2026 

Workflow Builder • UI Implementation Specification 

## **20. Mock data / TypeScript contracts** 

Tên field có thể thay đổi theo backend sau này, nhưng frontend mock nên có model đủ biểu diễn tính ĐỘNG ngay từ đầu. 

type WorkflowStatus = "DRAFT" | "PUBLISHED" | "SUSPENDED" | "DELETED"; interface WorkflowDefinition { id: string; name: string; description?: string; type: string; module?: string; ownerId: string; status: WorkflowStatus; draftVersion: string; trigger?: TriggerDefinition; participantScope?: ParticipantScope; variables: WorkflowVariable[]; nodes: NodeDefinition[]; connections: ConnectionDefinition[]; updatedAt: string; } interface WorkflowVariable { key: string; dataType: "STRING" | "NUMBER" | "BOOLEAN" | "DATE" | "OBJECT" | "LIST"; defaultValue?: ValueBinding; required?: boolean; } type ValueBinding = | { kind: "CONSTANT"; value: unknown } | { kind: "REFERENCE"; path: string } <u>| { kind: "EXPRESSION"; expression: string };</u> 

<mark>interface NodeDefinition {</mark> id: string; type: "APPROVAL" | "REVIEW" | "ASSIGNMENT" | "NOTIFICATION" | "CONDITION" | "FORM" | "HTTP" | "DATA" | "CODE"; name: string; config: Record<string, unknown>; position: { x: number; y: number }; } interface ConnectionDefinition { id: string; sourceNodeId: string; sourcePort?: string; // APPROVED, REJECTED, TRUE, FALSE... targetNodeId: string; condition?: ConditionExpression; } interface AssigneeResolver { type: "FIXED_USER" | "ROLE" | "GROUP" | "CURRENT_PARTICIPANT" | "PARTICIPANT_MANAGER" | "DYNAMIC"; value?: string <u>| ValueBinding;</u> 

Tài liệu triển khai frontend • 19/08/2026 

Workflow Builder • UI Implementation Specification 

<u><mark>}</mark></u> 

interface WorkflowInstanceSummary { id: string; requestCode: string; workflowId: string; workflowVersion: string; creatorId?: string; status: "PENDING" | "RUNNING" | "COMPLETED" | "REJECTED" | "CANCELLED"; currentStepLabels: string[]; activeAssignees: string[]; startedAt: string; slaStatus?: "ON_TIME" | "OVERDUE"; <u>}</u> 

## **21. Accessibility, responsive và keyboard behavior** 

### **21.1 Desktop-first và responsive** 

- Target chính 1440×1024. Tối thiểu desktop 1280 px. 

- Dưới 1280: sidebar có thể collapse icon-only 72 px; table cho horizontal scroll; designer right panel overlay. 

- Không cố ép workflow designer thành mobile editing đầy đủ. Dưới breakpoint tablet, cho read-only hoặc thông báo “Nên dùng màn hình lớn để chỉnh sửa”. 

- Modal node editor ở viewport thấp dùng max-height + internal scroll; footer luôn nhìn thấy. 

### **21.2 Keyboard/focus** 

- Tab order logic; focus ring blue rõ ràng. 

- Esc đóng popover/modal nếu không có unsaved critical state; nếu có dirty config thì confirm. 

- Modal trap focus và restore focus về trigger button khi đóng. 

- Tabs dùng Arrow Left/Right; Enter/Space activate. 

- Canvas nodes có thể select bằng keyboard nếu graph library hỗ trợ; Delete key không xóa ngay system node và destructive action nên confirm hoặc undo. 

Tài liệu triển khai frontend • 19/08/2026 

Workflow Builder • UI Implementation Specification 

## **22. Acceptance criteria & Definition of Done cho agent** 

### **22.1 Global DoD** 

- UI chạy được bằng mock data, không cần backend để demo các flow màn hình. 

- Route list/detail/designer deep-link được; refresh không mất route/tab chính. 

- Design tokens, App Shell, table, modal, badge, button nhất quán với mockup. 

- Tất cả form có validation state, disabled/loading state, keyboard focus và feedback. 

- Không còn terminology “Tạo Workflow Instance” cho designer/create definition. 

- Workflow Definition có thể cấu hình trigger, participant scope, variables, node, connection và validation. 

- Dynamic Value Picker/Context Explorer hoạt động ít nhất với mock context và có thể bind reference vào Condition/HTTP/message/form. 

- Assignee resolver hoạt động bằng cùng component ở Assignment/Approval/Review/Notification. 

- Human task có execution mode Single/For each participant trong data model và UI. 

- Condition node có output TRUE/FALSE hiển thị rõ trên canvas. 

- Publish bị chặn khi validation blocking errors tồn tại. 

- Runtime list thể hiện instance thực, không trộn với Workflow Definition. 

- Không hard-code business-specific node hoặc field vào engine UI. 

### **22.2 Checklist theo màn hình** 

|**Màn hình**|**Bắt buộc hoàn thành**|
|---|---|
|Users|Sync card, table, inline management level, Active/Inactive, permission action, pagination,<br>loading/empty/error.|
|Workflow list|Template/Workflow tabs, search/filter/my/create, table actions,pagination.|
|Create Workflow|Blank/template, metadata fields, validation, create→designer.|
|Designer|Canvas, Start/End, trigger placeholder, libraries, add/select/edit/delete node, edges,<br>save/validate/test/publish.|
|Node modal|3-column shell, context explorer, config,preview, footer actions.|
|Dynamic settings|Participant scope, workflow variables, dynamic valuepicker, assignee resolver, execution mode.|
|History|Timeline/version cards,pagination/filter.|
|Runtime|Search/filter/table, status/SLA badges, instance detail link.|



### **22.3 Những phần có thể mock trong frontend phase** 

- Connector authentication và đồng bộ thật. 

- HTTP Request thật ra internet; dùng deterministic mock response. 

- Code node sandbox execution; mock test result. 

- Publish/backend locking; mô phỏng trạng thái/version trong local store/repository. 

- Runtime engine thật; cung cấp fixture instances/tasks/timeline để UI hoạt động đầy đủ. 

### **22.4 Những phần KHÔNG được bỏ dù đang mock** 

- Phân biệt Definition và Instance. 

- Dynamic Value Binding và Context Explorer. 

- Participant Scope + dynamic resolver. 

- Validation flow. 

- Condition branching ports. 

- Version/status state trên UI. 

- Loading/error/empty/permission states cơ bản. 

Tài liệu triển khai frontend • 19/08/2026 



<!-- Start of picture text -->
[B) Workflow Builder Ngudi ding Nguyén Van A od<br>98 f Dong b6 ngudi dung<br>AR Naud ding Co a<br>i w _: SAPSuccessFactors2024-12-10Dist08:30noi aa<br>.<br>Danh sach ngudi dung<br>Ho tén Email Phong ban Chute vy Cap quiniy Trang thai Hanh dng<br>Nguyén Thi Mai nt@company.com N 6 Staff ¥ — hetive Phan quyén<br>Tran Hoang Bach ach.th@company.con ng Cong Backend Eng Staff Y Active Phan quyén<br>Le Minh Tam am im@company.com Phong Kinh doar Sales Leat Manager Y —Aetive = Phan quyén<br>Pham Hong Ding ang.ph any p Accountar Manager Y —— etive Phan quyan<br>VG Ngge Trinh npany.con Marketin Marketing Director Director ~ —Aetive Phin quyén<br>6 Hou Chau u.dh@company.co Ban Gidm 06 Executive Officer C-Level Y —Aetive Phan quyén<br>Hoang Quéc viet hq@company.c Phong Cong DevOps Spec Staff Y Inactive Phan quyén<br>Bui Phuong Théo ’@company. n Pha ega ur Staff ¥ Active Phan quyén<br><@ ><br><!-- End of picture text -->



<!-- Start of picture text -->
BR Workftow Bulider Workflow Nguyén Van 8 od<br>E < Danh sach Workflow<br>(Workflows.<br>dong<br>[= Phé duyétmua sim proval Published n v 202 v2. e (8)<br>l= Phe duyétnghi phép Approval Published This 28-10-15<br>\E  Phé duyét hop dong R ‘Suspended L 4<br>[= Reviewtai ligu ky thugt Revie Suspended Pham Van D 2028-08-11 v2<br>LE Phe duyét chi phi Approval Published Nguyén Van 4-11-28 v 2 (8)<br>am: | ><br><!-- End of picture text -->



<!-- Start of picture text -->
iB) Workflow Builder Workflow Nguyén Van 8 od<br>88 : Danh sach Workflow<br>1 Workflows:<br>Tén Template Loo Trang thé Ngudi tao Nady tao Phién ban Hanhdong<br>phe NauyénduyétVannghiB  phép prore Running n ®<br><B><br><!-- End of picture text -->



<!-- Start of picture text -->
rr Workflow Builder Worktiow > Nguyéniguyén VanVan B  PhéPhé duyétduyét nghi nghi phéphép Nauyén" Van8<br>(Workflows.<br>8 7 Version History& Change Log = Fitter<br>e<br>anges approver Thay d6i Ngubi phé duyét Cp 1tisLé Van C thanh L@ Minh Tam<br>v0 (32024-11-20000:90 - a NguydnThi Mai<br>hades step Thém bude Banh gié rdiroan ninhcho trang thiét bi CNTT<br>va<br>10<br>Hin thi 1-4 trong téng io <B><br><!-- End of picture text -->



<!-- Start of picture text -->
re Workflow Builder Workflow > Nguyéniguyén VanVan BB Phé duyé6 t nghi nghi phéphép Nguyén* VanB<br>AR Ngudi dir Theo doi Runtim<br>1 Workflows:<br>Request 1D Ngudi tao yéu cau Bude hign tal Nguoixi ly hign ta Trang théi Thdi glan bat dou SLA<br>REQ-1092 Nguyén Thi Mai f Capt Mint T Pending on-time<br>REQ-1081 Tran Hoang Bach duyét Ca Ngge Trnt Pending Overdue<br>REQ-1052 Pham Hong Dang Hoan tat q 46 thor n Completed on-time<br>REQ-1049 Bui Phuong Théo Phe duyet Cap 1 Lem Rejected on-time<br>REQ-1030 Hoang Quée viet tu Joang @ Cancelled on-time<br><!-- End of picture text -->



<!-- Start of picture text -->
oh on NourtnVin 8 Phe dye gh prép a ‘iene<br>PR Noudi din TRIGGERS<br>IS Worktiows Lya chon event kich hoat workflow<br>% __Kichhoattha céng<br>o) Theo lich trinh<br>® Start<br>ey Khi giti biéumau<br>(3)<br>uu ey Theo sy kién Webhook<br>img dung bén ngodi qua URL AI<br>End<br><!-- End of picture text -->



<!-- Start of picture text -->
GB) Worksiow ouider sans 9: Tyo inetancs wr<br>88 ; NguyénVan B - Phé duyét nghi phép Draft Xée minh<br>a Thuvign x<br>1 Workflows cs fa chon node dé thém vo workflow<br>> NoHIEPVU<br>© _ PhaGil youduyétcau va ché phé duyéttir quan ly hoa<br>© Start Kiém duyét<br>is] Kich hoat thd céng Phand6i ngO cénghode vai trd cy th<br>jsrail © _ GiThéngthongbéobao ty dong (Emai 9p, Slac<br>z i  COTLOI<br>@ End<br>8 Bangdi ligu<br>Truy vn va xi ly dot ju tr<br>HTTPGui yeuRequestcBu gol API bann<br>B Béumiu<br>3+ DIEU KHIEN LUONG XU LY<br><!-- End of picture text -->



<!-- Start of picture text -->
~~ + Tootnetance ms<br>@ Phan cong . za<br>PHANCONG  - Giao nhigm vy hod hd so.cho mét nqubi ding, di ngihose vai trd cy thé<br>Dir ligu dau vao Cu hinh nguéi nhan Xem truekét qua<br>—_ Loal nguéi nhan<br>Ngudi cy thé, hoge vai tre<br>Chi tiét cong viec<br>Kénh théng bio<br>© emai t @) OQ n-app<br><!-- End of picture text -->



<!-- Start of picture text -->
mm » Tootnetance = %<br>DIEU KIEN (IF / ELSE)<br>0 lieu du vao Céu hinh quy tac Xem truekét qua<br>¥ € {}Getbody.scoresTest Scores 1 (Sscores.t1+ Sscores.t2 + Sscores.t3) / 3 Két quaeeeOncudi cing<br>1 80 is greater than 70<br>75 aad Cac buéc kiém tra<br>3 85 [Get Candidate}.Z 5 status equalsts Condition 1<br>© & Get Candidate<br>Seer (80 + 75 + 85) /3= 80<br>Pcs herve + Thém diéukign ) Them nhom sun<br>80>70 9 tru<br>@® Thém nhom HOAC Condition2<br>status = “ACTIVE<br>"ACTIVE" == "ACTIVE? # true<br>D ety ermte rome 8<br><!-- End of picture text -->



<!-- Start of picture text -->
m= » Tooinetanee = 3<br>© PhéPut  duyétouver ‘ @ x Lou |<br>DG liéu dau vao Xem truéc két qua<br>Cau hinh nguoi phé duyét<br>—— Loai ngubiphe duyét Nguoi phe duyét 48 xae din<br>Ngudi cy thé, vai tr, hose ngubi dung dong ,<br>| | None<br>Chi tiétcme yéua cauon Dy kién SLA<br>Tiéudé yéu cau oe Bong<br>far Ni<br>Ty dong tir chdi N<br>au ra cia Node<br>© 08 tirchdi<br>SLA& Chuyén cap Thiét lap han chét phé duyet @)<br>Quy tic chuyén cdip / Xtrly khi qué han<br>ety ermtn rome &<br><!-- End of picture text -->



<!-- Start of picture text -->
Workflow ageyte van od<br>Danh sach Workflow<br>Tao workflow instance x<br>Théng tin co ban<br>a Te90 ti<br>Owennmmaing OnE y~ oom 4<br>Tén workflow instance *<br>’ Nguyén Van B - Phé. duyét nghi phép ‘ie<br>Mota<br>Loai workflow * Module<br>Approval Operations<br>Quyén sé hitu & Phién ban<br> Nouyénvan 8 . 10<br><!-- End of picture text -->



<!-- Start of picture text -->
woe» Too instance sere ee t<br>06 figudtu vao Cau hinh nguéi nhan Xom trusekét qua<br>Ngutdi cy thé, hod vai ted<br>Noi dung thong béo<br>7 t ic k<br>Kénh théng béo<br>© emai © Om<br>Fy Teams ES _Webhook<br><!-- End of picture text -->

