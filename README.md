# Workflow Builder + Internal HRM

Hệ thống gồm React/Vite frontend và Spring Boot backend. Backend quản lý dữ liệu HRM nội bộ, cơ cấu tổ chức phân cấp, quan hệ quản lý nhân viên, role/permission riêng của Workflow Builder và runtime thực thi workflow có participant snapshot.

## Chạy hệ thống

Yêu cầu: Docker Desktop, Java 21, Maven 3.9+ và Node.js 22+.

```bash
docker compose up --build -d
cd frontend
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080/api/v1`
- Health check: `http://localhost:8080/actuator/health`
- MySQL: `localhost:3306`, database/user/password là `workflow_builder` / `workflow` / `workflow`

Tài khoản seed: `admin` / `admin123`. Các nhân viên seed dùng mật khẩu `Welcome@123`. Frontend đăng nhập qua token; `X-User-Id` chỉ được bật ở profile `dev` phía backend và chỉ được frontend gửi khi đặt tường minh `VITE_ALLOW_DEV_USER_HEADER=true`.

Production dùng biến môi trường bắt buộc và tắt dev header:

```bash
Copy-Item .env.production.example .env.production
docker compose --env-file .env.production -f compose.yaml -f compose.prod.yaml up --build -d
```

## Kiểm thử và build

```bash
cd backend
mvn test

cd ../frontend
npm run build
```

Integration test backend dùng H2 ở MySQL compatibility mode và chạy Flyway thật. Bộ test bao phủ đăng nhập/phân quyền theo scope tổ chức, CRUD HRM qua JPA, hierarchy, workflow validate/publish/version, form validation, manager fallback, hủy instance và toàn bộ luồng đánh giá nhân viên có nhánh HR yêu cầu làm lại.

## Cấu trúc

```text
backend/
  src/main/java/com/acme/workflow/
    auth/          authentication và permission theo organization scope
    identity/      JPA entities/repositories cho HRM, organization, role
    directory/     use case và API quản trị HRM
    workflow/      definition, validation, publish và immutable versions
    runtime/       engine, participant execution, task, result, notification
    audit/         audit persistence
    config/        cấu hình và seed definition
  src/main/resources/db/
    migration/     Flyway schema + HRM seed
    seed/           workflow đánh giá nhân viên chuẩn
frontend/
  src/api/         HTTP client
  src/pages/       màn HRM, role, designer, runtime và task
doc/               đặc tả nghiệp vụ gốc và tài liệu triển khai
```

Chi tiết thiết kế backend, API và semantics runtime nằm tại [`doc/backend-implementation.md`](doc/backend-implementation.md).
