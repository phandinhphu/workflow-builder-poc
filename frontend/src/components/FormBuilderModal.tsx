import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import DynamicValueField from "./DynamicValueField";

export interface FormField {
  id: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "select"
    | "radio"
    | "checkbox"
    | "user-picker"
    | "file";
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  readOnly?: boolean;
  visibleWhen?: string;
  outputMapping?: string;
}

interface FormBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fields: FormField[]) => void;
  initialFields?: FormField[];
  nodes?: any[];
  trigger?: any;
  variables?: any[];
}

const FIELD_TYPES: { value: FormField["type"]; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select" },
  { value: "radio", label: "Radio" },
  { value: "checkbox", label: "Checkbox" },
  { value: "user-picker", label: "User Picker" },
  { value: "file", label: "File" },
];

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export default function FormBuilderModal({
  isOpen: _isOpen,
  onClose,
  onSave,
  initialFields = [],
  nodes = [],
  trigger,
  variables = [],
}: FormBuilderModalProps) {
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [activeTab, setActiveTab] = useState<"fields" | "preview">("fields");

  const addField = () => {
    const newField: FormField = {
      id: makeId("field"),
      label: "Field " + (fields.length + 1),
      type: "text",
      required: false,
      placeholder: "Nhập giá trị",
    };
    setFields((prev) => [...prev, newField]);
  };

  const removeField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
  };

  const updateField = (fieldId: string, patch: Partial<FormField>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
    );
  };

  const moveField = (index: number, direction: -1 | 1) => {
    setFields((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const duplicateKeys = fields
    .map((f) => f.id)
    .filter((id, idx, arr) => arr.indexOf(id) !== idx);

  const hasValidFields =
    fields.length > 0 &&
    duplicateKeys.length === 0 &&
    fields.every((f) => f.label.trim() !== "");

  const previewJson = JSON.stringify(
    {
      fields: fields.map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        required: f.required,
        placeholder: f.placeholder,
        options: f.options,
        validation: f.validation,
        outputMapping: f.outputMapping,
      })),
    },
    null,
    2,
  );

  return (
    <Fragment>
      <Dialog
        as="div"
        className="relative z-[85]"
        open={_isOpen}
        onClose={onClose}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-4 scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-xl bg-white shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <div>
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-bold text-navy"
                    >
                      Trình xây dựng biểu mẫu
                    </Dialog.Title>
                    <p className="mt-1 text-sm text-muted">
                      Tạo schema form cho human task với field key ổn định để
                      map dữ liệu vào Workflow Context.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-navy p-1 rounded-full hover:bg-gray-100"
                    onClick={onClose}
                    aria-label="Đóng"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-page">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-navy">
                      Danh sách trường
                    </h4>
                    <button
                      onClick={addField}
                      className="text-xs font-semibold text-primary hover:text-primary-dark flex items-center gap-1"
                    >
                      <PlusIcon className="w-3 h-3" /> Thêm trường
                    </button>
                  </div>

                  {duplicateKeys.length > 0 && (
                    <div className="mb-3 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-xs text-red-700">
                      Field key trùng lặp: {duplicateKeys.join(", ")}. Key phải
                      duy nhất để map dữ liệu.
                    </div>
                  )}

                  {fields.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-muted">
                      <PlusIcon className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-sm">
                        Chưa có trường nào. Bấm "Thêm trường" để bắt đầu.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {fields.map((field, idx) => (
                      <div
                        key={field.id}
                        className="bg-white rounded-lg p-4 border border-border shadow-sm"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => moveField(idx, -1)}
                              disabled={idx === 0}
                              className="text-gray-400 hover:text-navy disabled:opacity-30"
                              aria-label="Di chuyển lên"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => moveField(idx, 1)}
                              disabled={idx === fields.length - 1}
                              className="text-gray-400 hover:text-navy disabled:opacity-30"
                              aria-label="Di chuyển xuống"
                            >
                              ▼
                            </button>
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold">
                              {field.type.slice(0, 1).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <input
                              value={field.label}
                              onChange={(e) =>
                                updateField(field.id, { label: e.target.value })
                              }
                              className="w-full text-sm font-medium text-navy border border-transparent hover:border-border rounded px-2 py-1 focus:outline-none focus:border-primary"
                              placeholder="Nhãn hiển thị"
                            />
                            <p className="text-xs text-muted font-mono px-2">
                              Key: {field.id}
                            </p>
                          </div>
                          <button
                            onClick={() => removeField(field.id)}
                            className="text-gray-400 hover:text-danger p-1"
                            aria-label={`Xóa ${field.label}`}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <label className="block text-xs text-muted mb-1">
                              Loại
                            </label>
                            <select
                              value={field.type}
                              onChange={(e) =>
                                updateField(field.id, {
                                  type: e.target.value as FormField["type"],
                                })
                              }
                              className="w-full border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
                            >
                              {FIELD_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-muted mb-1">
                              Placeholder
                            </label>
                            <input
                              value={field.placeholder || ""}
                              onChange={(e) =>
                                updateField(field.id, {
                                  placeholder: e.target.value,
                                })
                              }
                              className="w-full border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs text-muted mb-1">
                              Giá trị mặc định
                            </label>
                            <DynamicValueField
                              value={field.defaultValue || ""}
                              onChange={(value) =>
                                updateField(field.id, { defaultValue: value })
                              }
                              placeholder="Giá trị cố định hoặc chọn output từ bước trước"
                              nodes={nodes}
                              trigger={trigger}
                              variables={variables}
                            />
                          </div>
                          <div className="flex items-center gap-2 pt-5">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) =>
                                updateField(field.id, {
                                  required: e.target.checked,
                                })
                              }
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm">Bắt buộc</span>
                          </div>
                        </div>

                        {(field.type === "select" ||
                          field.type === "radio") && (
                          <div className="mt-3">
                            <label className="block text-xs text-muted mb-1">
                              Options (mỗi dòng: value: label)
                            </label>
                            <textarea
                              rows={2}
                              value={(field.options || [])
                                .map((o) => `${o.value}: ${o.label}`)
                                .join("\n")}
                              onChange={(e) => {
                                const lines = e.target.value
                                  .split("\n")
                                  .filter((l) => l.trim());
                                const options = lines.map((line) => {
                                  const parts = line.split(":");
                                  return {
                                    value: parts[0].trim(),
                                    label: parts.slice(1).join(":").trim(),
                                  };
                                });
                                updateField(field.id, { options });
                              }}
                              className="w-full border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-primary resize-none"
                            />
                          </div>
                        )}

                        {/* <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-3 items-center">
                          <label className="text-xs text-muted">Output Mapping</label>
                          <input
                            value={field.outputMapping || ''}
                            onChange={(e) => updateField(field.id, { outputMapping: e.target.value })}
                            placeholder="vd: trigger.body.fullName"
                            className="flex-1 min-w-[220px] border border-border rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-primary"
                          />
                        </div> */}
                      </div>
                    ))}
                  </div>

                  {activeTab === "preview" && (
                    <div className="mt-4 bg-white rounded-lg border border-border p-4">
                      <h4 className="text-sm font-bold text-navy mb-2">
                        JSON schema
                      </h4>
                      <pre className="bg-gray-50 rounded p-3 text-xs font-mono overflow-auto max-h-72">
                        {previewJson}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-gray-50">
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                      onClick={() => setActiveTab("fields")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md ${activeTab === "fields" ? "bg-white shadow text-navy" : "text-muted hover:text-navy"}`}
                    >
                      Trình chỉnh sửa
                    </button>
                    <button
                      onClick={() => setActiveTab("preview")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md ${activeTab === "preview" ? "bg-white shadow text-navy" : "text-muted hover:text-navy"}`}
                    >
                      Xem trước schema
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 border border-border rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={!hasValidFields}
                      onClick={() => {
                        onSave(fields);
                        onClose();
                      }}
                      className="px-4 py-2 bg-primary rounded-md text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Lưu Form
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Fragment>
  );
}
