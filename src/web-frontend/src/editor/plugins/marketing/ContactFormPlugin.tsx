/**
 * 联系表单插件 - ContactFormPlugin
 * Contact form with name/email/phone/message fields
 */
import React, { useState } from 'react';
import type { IComponentPlugin } from '../../types/plugin';
import { ComponentCategory } from '../../types/plugin';

// ===== Types =====

type FormField = 'name' | 'email' | 'phone' | 'message';

interface FormState {
  name: string;
  email: string;
  phone: string;
  message: string;
}

const FIELD_LABELS: Record<FormField, string> = {
  name: '姓名',
  email: '邮箱',
  phone: '电话',
  message: '消息',
};

const FIELD_PLACEHOLDERS: Record<FormField, string> = {
  name: '请输入姓名',
  email: '请输入邮箱地址',
  phone: '请输入电话号码',
  message: '请输入消息内容',
};

// ===== Renderer =====

interface ContactFormRendererProps {
  fields?: string[];
  submitText?: string;
  submitApi?: string;
  [key: string]: unknown;
}

const ContactFormRenderer: React.FC<ContactFormRendererProps> = ({
  fields = ['name', 'email', 'phone', 'message'],
  submitText = '提交',
  submitApi = '',
  ...rest
}) => {
  const [formState, setFormState] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const activeFields = (fields as FormField[]).filter(
    (f) => f in FIELD_LABELS
  );

  const handleChange = (field: FormField, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);

    try {
      if (submitApi) {
        await fetch(submitApi, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formState),
        });
      }
      setSubmitted(true);
    } catch {
      // Silently handle error in renderer
      console.warn('[ContactForm] Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const styleFromProps: Record<string, unknown> = {};
  const passThrough: Record<string, unknown> = {};
  const styleKeys = new Set(['maxWidth', 'padding', 'backgroundColor']);

  for (const [key, value] of Object.entries(rest)) {
    if (styleKeys.has(key)) {
      styleFromProps[key] = value;
    } else {
      passThrough[key] = value;
    }
  }

  if (submitted) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: 'rgba(255,255,255,0.8)',
          ...styleFromProps,
        }}
        {...passThrough}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <div style={{ fontSize: 18, fontWeight: 500 }}>提交成功！</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
          感谢您的联系，我们会尽快回复。
        </div>
        <button
          onClick={() => {
            setSubmitted(false);
            setFormState({ name: '', email: '', phone: '', message: '' });
          }}
          style={{
            marginTop: 16,
            padding: '8px 20px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 6,
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          再次提交
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        width: '100%',
        maxWidth: 500,
        margin: '0 auto',
        ...styleFromProps,
      }}
      {...passThrough}
    >
      {activeFields.map((field) => (
        <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            {FIELD_LABELS[field]}
          </label>
          {field === 'message' ? (
            <textarea
              value={formState[field]}
              onChange={(e) => handleChange(field, e.target.value)}
              placeholder={FIELD_PLACEHOLDERS[field]}
              rows={4}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6,
                color: '#fff',
                fontSize: 14,
                resize: 'vertical',
                outline: 'none',
              }}
            />
          ) : (
            <input
              type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
              value={formState[field]}
              onChange={(e) => handleChange(field, e.target.value)}
              placeholder={FIELD_PLACEHOLDERS[field]}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6,
                color: '#fff',
                fontSize: 14,
                outline: 'none',
              }}
            />
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: '12px 24px',
          background: submitting ? 'rgba(22,119,255,0.5)' : '#1677ff',
          border: 'none',
          borderRadius: 6,
          color: '#fff',
          fontSize: 16,
          fontWeight: 500,
          cursor: submitting ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {submitting ? '提交中...' : submitText}
      </button>
    </form>
  );
};

// ===== Plugin Definition =====

export const ContactFormPlugin: IComponentPlugin = {
  id: 'builtin.contact-form',
  name: '联系表单',
  category: ComponentCategory.MARKETING,
  version: '1.0.0',
  icon: '📋',
  description: '联系表单，包含姓名/邮箱/电话/消息字段',

  renderer: ContactFormRenderer as React.FC<Record<string, unknown>>,

  defaultConfig: {
    fields: ['name', 'email', 'phone', 'message'],
    submitText: '提交',
    submitApi: '',
  },

  defaultStyles: {
    width: '100%',
    maxWidth: '500px',
    margin: '0 auto',
  },
};

export default ContactFormPlugin;
