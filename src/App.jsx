import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Home, Users, Plus, Bell, BarChart3, Search, Phone, MessageCircle,
  ChevronLeft, Check, X, Trash2, Edit2, Star, Calendar, Clock,
  AlertCircle, MoreVertical, ShoppingBag, Receipt, ArrowUpRight,
  TrendingUp, Sparkles, MapPin, Mail, FileText, Filter, ChevronDown,
  CheckCircle2, Circle, AlertTriangle, Zap, Award, Gift, Coffee,
  Send, MessageSquare, Settings, Copy, CheckSquare, Square,
  Smartphone, Megaphone, Eye, Pencil, Sliders, Inbox,
  Download, Upload, FileSpreadsheet, Database, ClipboardPaste
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer, Tooltip, Cell, PieChart, Pie, Legend,
  RadialBarChart, RadialBar, ComposedChart, Line
} from 'recharts';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

// ============================================================
// STORAGE WRAPPER — works in Claude.ai (window.storage) and standalone (localStorage)
// ============================================================
const storage = {
  async get(key) {
    if (typeof window !== 'undefined' && window.storage?.get) {
      try { return await storage.get(key); } catch { /* fall through */ }
    }
    try {
      const v = localStorage.getItem(key);
      return v != null ? { value: v } : null;
    } catch { return null; }
  },
  async set(key, value) {
    if (typeof window !== 'undefined' && window.storage?.set) {
      try { return await storage.set(key, value); } catch { /* fall through */ }
    }
    try { localStorage.setItem(key, value); return { value }; }
    catch { return null; }
  }
};

// ============================================================
// DESIGN TOKENS
// ============================================================
const COLORS = {
  bg: '#FAF6EF',          // warm cream paper
  bgAlt: '#F2EBDC',       // deeper cream
  surface: '#FFFFFF',     // pure white card
  surfaceAlt: '#FBF8F2',  // off-white surface
  ink: '#1F1B16',         // deep warm black
  inkSoft: '#5C5446',     // muted brown-gray
  inkFaint: '#9A917F',    // hint
  border: '#E5DCC8',      // soft border
  borderStrong: '#C9BC9F',// emphasized border
  jade: '#1F6B4F',        // primary jade green
  jadeSoft: '#E1EFE7',    // jade tint bg
  jadeDeep: '#0E4A36',    // jade deep text
  persimmon: '#C44A2C',   // warm coral-orange (urgent)
  persimmonSoft: '#FBE5DC',
  amber: '#A06A1A',       // VIP gold
  amberSoft: '#F7E8C8',
  plum: '#6B3D5C',        // negotiation
  plumSoft: '#EFDDE9',
  ocean: '#2D5670',       // info blue-gray
  oceanSoft: '#DCE6EE',
  rose: '#B23B3B',        // danger
  roseSoft: '#F5D8D8',
  sage: '#5C7A4D',        // success
  sageSoft: '#E1EBD7'
};

const TAGS = {
  vip:     { label: 'VIP',         bg: COLORS.amberSoft,     fg: COLORS.amber,     dot: COLORS.amber },
  new:     { label: 'Mới',         bg: COLORS.oceanSoft,     fg: COLORS.ocean,     dot: COLORS.ocean },
  deal:    { label: 'Đàm phán',    bg: COLORS.plumSoft,      fg: COLORS.plum,      dot: COLORS.plum },
  care:    { label: 'Cần CSKH',    bg: COLORS.persimmonSoft, fg: COLORS.persimmon, dot: COLORS.persimmon },
  regular: { label: 'Khách quen',  bg: COLORS.jadeSoft,      fg: COLORS.jadeDeep,  dot: COLORS.jade },
  old:     { label: 'Khách cũ',    bg: '#EDE7D9',            fg: COLORS.inkSoft,   dot: COLORS.inkSoft }
};

// ============================================================
// MESSAGE TEMPLATES (Zalo / SMS)
// ============================================================
const TEMPLATE_CATEGORIES = {
  welcome:  { label: 'Chào mừng',   color: COLORS.ocean },
  order:    { label: 'Đơn hàng',    color: COLORS.jade },
  care:     { label: 'Chăm sóc',    color: COLORS.persimmon },
  sales:    { label: 'Bán hàng',    color: COLORS.amber },
  promo:    { label: 'Khuyến mãi',  color: COLORS.plum },
  greeting: { label: 'Lời chúc',    color: COLORS.sage }
};

const DEFAULT_TEMPLATES = [
  { id: 't_welcome',     name: 'Chào mừng khách mới',     category: 'welcome',  channel: 'both',
    body: 'Chào {{name}}! Cảm ơn bạn đã quan tâm đến {{shop}}. Mình có thể hỗ trợ gì cho bạn hôm nay nhé?' },
  { id: 't_order_confirm', name: 'Xác nhận đơn hàng',     category: 'order',    channel: 'both',
    body: 'Cảm ơn {{first_name}}! Đơn #{{order_id}} của bạn ({{order_total}}) đã được tiếp nhận. {{shop}} sẽ liên hệ sớm để xác nhận nhé.' },
  { id: 't_order_ship',  name: 'Đơn đang giao',           category: 'order',    channel: 'both',
    body: '{{first_name}} ơi, đơn #{{order_id}} đã giao cho shipper. Bạn nhận hàng trong hôm nay nhé. Có gì gọi mình ngay!' },
  { id: 't_birthday',    name: 'Voucher sinh nhật',       category: 'promo',    channel: 'both',
    body: 'Chúc mừng sinh nhật {{name}}! {{shop}} tặng bạn voucher giảm 15% áp dụng đến cuối tháng. Nhắn lại để mình gửi mã nhé!' },
  { id: 't_follow_silent', name: 'Hỏi thăm sau im lặng',  category: 'care',     channel: 'both',
    body: '{{first_name}} ơi, lâu rồi không thấy bạn ghé. Shop vừa có hàng mới về, có thời gian mình tư vấn cho bạn nhé?' },
  { id: 't_quote_followup', name: 'Theo dõi báo giá',     category: 'sales',    channel: 'both',
    body: 'Chào {{name}}, mình muốn hỏi xem bạn có cần thêm thông tin gì về báo giá đã gửi không? Mình sẵn lòng giải đáp.' },
  { id: 't_thank_after', name: 'Cảm ơn sau đơn hàng',     category: 'order',    channel: 'both',
    body: 'Cảm ơn {{name}} đã tin tưởng {{shop}}! Nếu sản phẩm có vấn đề gì, đừng ngại nhắn cho mình nhé. Hẹn gặp lại bạn lần sau!' },
  { id: 't_promo',       name: 'Thông báo khuyến mãi',    category: 'promo',    channel: 'both',
    body: '{{first_name}} ơi! {{shop}} đang có ưu đãi giảm đến 30% cho khách thân thiết. Áp dụng đến hết tuần này. Inbox mình để biết thêm!' },
  { id: 't_reengage',    name: 'Mời quay lại',            category: 'care',     channel: 'both',
    body: 'Chào {{name}}, đã lâu mình không có dịp chăm sóc bạn. Bạn có cần hỗ trợ gì không? Reply tin này nhé!' },
  { id: 't_holiday',     name: 'Chúc lễ / Tết',           category: 'greeting', channel: 'both',
    body: '{{shop}} kính chúc {{name}} và gia đình một năm mới an khang thịnh vượng, vạn sự như ý! Cảm ơn vì luôn đồng hành cùng shop!' }
];

const DEFAULT_API_CONFIG = {
  userName: '',
  shopName: 'Shop của tôi',
  zalo: { enabled: false, oaId: '', appId: '', accessToken: '' },
  sms:  { enabled: false, provider: 'speedsms', token: '', brandname: '' }
};

// ============================================================
// SAMPLE DATA
// ============================================================
const SAMPLE_CUSTOMERS = [
  { id: 'c1', name: 'Nguyễn Thị Hương', phone: '0901 234 567', email: 'huong.nguyen@gmail.com', address: 'Quận 1, TP.HCM', tag: 'vip', notes: 'Khách quen 2 năm, ưa sản phẩm cao cấp. Sinh nhật 15/3.', totalSpent: 45200000, orderCount: 12, createdAt: '2024-03-15', lastInteraction: '2026-04-27' },
  { id: 'c2', name: 'Trần Văn Minh', phone: '0912 345 678', email: 'minh.tran@email.com', address: 'Quận Bình Thạnh, TP.HCM', tag: 'new', notes: 'Mới biết đến qua Facebook ads.', totalSpent: 0, orderCount: 0, createdAt: '2026-04-28', lastInteraction: '2026-04-28' },
  { id: 'c3', name: 'Lê Thị Mai', phone: '0923 456 789', email: 'maile@gmail.com', address: 'Quận 7, TP.HCM', tag: 'deal', notes: 'Đang xem xét Combo VIP. Cần giảm 10%.', totalSpent: 8500000, orderCount: 2, createdAt: '2025-11-20', lastInteraction: '2026-04-28' },
  { id: 'c4', name: 'Phạm Quang Huy', phone: '0934 567 890', email: 'huypq@yahoo.com', address: 'Thủ Đức, TP.HCM', tag: 'care', notes: '2 tuần chưa phản hồi tin nhắn. Trước đây mua đều.', totalSpent: 18700000, orderCount: 5, createdAt: '2025-06-10', lastInteraction: '2026-04-15' },
  { id: 'c5', name: 'Đỗ Thị Lan', phone: '0945 678 901', email: 'lan.do@email.com', address: 'Quận 3, TP.HCM', tag: 'regular', notes: 'Hay mua tặng gia đình, đặt định kỳ hàng tháng.', totalSpent: 32400000, orderCount: 18, createdAt: '2024-08-22', lastInteraction: '2026-04-25' },
  { id: 'c6', name: 'Vũ Hoàng Nam', phone: '0956 789 012', email: 'namvh@gmail.com', address: 'Tân Bình, TP.HCM', tag: 'vip', notes: 'Doanh nghiệp, đặt số lượng lớn.', totalSpent: 78900000, orderCount: 8, createdAt: '2024-12-05', lastInteraction: '2026-04-26' },
  { id: 'c7', name: 'Bùi Thanh Thảo', phone: '0967 890 123', email: 'thaobt@gmail.com', address: 'Gò Vấp, TP.HCM', tag: 'old', notes: 'Đã không mua từ tháng 1.', totalSpent: 12300000, orderCount: 4, createdAt: '2024-11-15', lastInteraction: '2026-01-10' },
  { id: 'c8', name: 'Hoàng Đức Anh', phone: '0978 901 234', email: 'anhhd@email.com', address: 'Quận 10, TP.HCM', tag: 'regular', notes: 'Khách thân thiện, hay giới thiệu bạn bè.', totalSpent: 21600000, orderCount: 9, createdAt: '2025-02-18', lastInteraction: '2026-04-22' }
];

const SAMPLE_PRODUCTS = [
  { id: 'p1', name: 'Gói cơ bản',     sku: 'BASIC-01', price: 350000  },
  { id: 'p2', name: 'Gói tiêu chuẩn', sku: 'STD-01',   price: 750000  },
  { id: 'p3', name: 'Gói cao cấp',    sku: 'PREM-01',  price: 1200000 },
  { id: 'p4', name: 'Combo VIP',      sku: 'VIP-01',   price: 2500000 },
  { id: 'p5', name: 'Phụ kiện A',     sku: 'ACC-A',    price: 150000  },
  { id: 'p6', name: 'Phụ kiện B',     sku: 'ACC-B',    price: 280000  },
  { id: 'p7', name: 'Dịch vụ tư vấn', sku: 'SVC-01',   price: 500000  }
];

const SAMPLE_REMINDERS = [
  { id: 'r1', customerId: 'c1', task: 'Gọi xác nhận đơn hàng #1247', dueDate: '2026-04-29T10:30', urgent: true,  completed: false },
  { id: 'r2', customerId: 'c2', task: 'Gửi báo giá Gói tiêu chuẩn',   dueDate: '2026-04-29T14:00', urgent: false, completed: false },
  { id: 'r3', customerId: 'c4', task: 'Follow up sau 2 tuần im lặng', dueDate: '2026-04-29T16:30', urgent: false, completed: false },
  { id: 'r4', customerId: 'c3', task: 'Chốt đàm phán giá Combo VIP',   dueDate: '2026-04-30T09:00', urgent: false, completed: false },
  { id: 'r5', customerId: 'c5', task: 'Gửi voucher sinh nhật',        dueDate: '2026-05-02T08:00', urgent: false, completed: false },
  { id: 'r6', customerId: 'c8', task: 'Cảm ơn vì giới thiệu bạn bè',  dueDate: '2026-04-28T15:00', urgent: false, completed: true  }
];

const SAMPLE_INTERACTIONS = [
  { id: 'i1', customerId: 'c1', type: 'order', note: 'Đặt đơn #1247 — Combo VIP, tổng 4.2tr',                date: '2026-04-27' },
  { id: 'i2', customerId: 'c1', type: 'call',  note: 'Gọi 8 phút — quan tâm sản phẩm mới',                  date: '2026-04-22' },
  { id: 'i3', customerId: 'c1', type: 'note',  note: 'Đã gửi catalog tháng 4',                              date: '2026-04-15' },
  { id: 'i4', customerId: 'c4', type: 'note',  note: 'Gửi báo giá — chưa phản hồi',                         date: '2026-04-15' },
  { id: 'i5', customerId: 'c4', type: 'msg',   note: 'Nhắn tin hỏi thăm qua Zalo',                          date: '2026-04-08' },
  { id: 'i6', customerId: 'c4', type: 'order', note: 'Mua hàng — Gói cao cấp, 8.7tr',                       date: '2026-04-01' },
  { id: 'i7', customerId: 'c3', type: 'note',  note: 'Đã gửi báo giá Combo VIP có ưu đãi',                  date: '2026-04-28' },
  { id: 'i8', customerId: 'c3', type: 'call',  note: 'Tư vấn 15 phút về gói dịch vụ',                       date: '2026-04-25' }
];

const SAMPLE_ORDERS = [
  { id: 'o1', customerId: 'c1', items: [{ productId: 'p4', qty: 1, price: 2500000 }, { productId: 'p5', qty: 2, price: 150000 }], total: 2800000, discount: 0, note: '', status: 'completed', date: '2026-04-27' },
  { id: 'o2', customerId: 'c5', items: [{ productId: 'p2', qty: 2, price: 750000 }], total: 1500000, discount: 0, note: 'Giao trước 17h', status: 'completed', date: '2026-04-25' },
  { id: 'o3', customerId: 'c6', items: [{ productId: 'p3', qty: 5, price: 1200000 }], total: 6000000, discount: 300000, note: 'Khách doanh nghiệp', status: 'completed', date: '2026-04-26' },
  { id: 'o4', customerId: 'c8', items: [{ productId: 'p2', qty: 1, price: 750000 }, { productId: 'p7', qty: 1, price: 500000 }], total: 1250000, discount: 0, note: '', status: 'completed', date: '2026-04-22' }
];

// ============================================================
// HELPERS
// ============================================================
const fmtVND = n => n.toLocaleString('vi-VN') + ' ₫';
const fmtVNDShort = n => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' tỷ';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' tr';
  if (n >= 1000)          return Math.round(n / 1000) + 'k';
  return String(n);
};

const getInitials = name => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[parts.length - 1][0] + parts[0][0]).toUpperCase();
};

const formatRelative = dateStr => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const days = Math.floor(diff / 86400000);
  if (days < 0) return formatDateVN(dateStr);
  if (days === 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  if (days < 7)   return `${days} ngày trước`;
  if (days < 30)  return `${Math.floor(days / 7)} tuần trước`;
  if (days < 365) return `${Math.floor(days / 30)} tháng trước`;
  return `${Math.floor(days / 365)} năm trước`;
};

const formatDateVN = dateStr => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};

const formatTime = dateStr => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

const isSameDay = (a, b) => {
  const x = new Date(a), y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
};

const isThisWeek = dateStr => {
  const d = new Date(dateStr);
  const now = new Date();
  const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(start.getDate() + 7);
  return d >= start && d < end;
};

const genId = () => Math.random().toString(36).slice(2, 10);

// ============================================================
// MESSAGING HELPERS — Zalo / SMS
// ============================================================
const cleanPhone = phone => phone.replace(/\D/g, '');
const phoneE164  = phone => {
  const c = cleanPhone(phone);
  return c.startsWith('0') ? '84' + c.slice(1) : c;
};

const fillTemplate = (body, customer, ctx = {}) => {
  if (!customer) return body;
  const firstName = customer.name.trim().split(/\s+/).pop();
  return body
    .replace(/\{\{name\}\}/g,        customer.name)
    .replace(/\{\{first_name\}\}/g,  firstName)
    .replace(/\{\{phone\}\}/g,       customer.phone)
    .replace(/\{\{order_id\}\}/g,    ctx.orderId    || '')
    .replace(/\{\{order_total\}\}/g, ctx.orderTotal != null ? fmtVND(ctx.orderTotal) : '')
    .replace(/\{\{discount\}\}/g,    ctx.discount   != null ? fmtVND(ctx.discount)   : '')
    .replace(/\{\{shop\}\}/g,        ctx.shopName   || 'Shop của tôi');
};

// Detect unfilled variables (e.g., {{order_id}} missing context)
const findUnfilledVars = msg => {
  const matches = msg.match(/\{\{[a-z_]+\}\}/g);
  return matches ? [...new Set(matches)] : [];
};

// Open Zalo via deep link (works on mobile + opens Zalo Web on desktop)
const sendViaZalo = (phone, message) => {
  try { navigator.clipboard?.writeText(message); } catch {}
  const e164 = phoneE164(phone);
  window.open(`https://zalo.me/${e164}`, '_blank', 'noopener,noreferrer');
  return { ok: true, mode: 'deeplink', channel: 'zalo' };
};

// Open native SMS app with prefilled body
const sendViaSMS = (phone, message) => {
  const url = `sms:${cleanPhone(phone)}?body=${encodeURIComponent(message)}`;
  window.location.href = url;
  return { ok: true, mode: 'deeplink', channel: 'sms' };
};

// Make a phone call
const callNumber = phone => {
  window.location.href = `tel:${cleanPhone(phone)}`;
};

// Stub for ZNS API call (requires backend proxy — see Settings panel)
// Real call structure: POST /api/send-zns { phone, templateId, params }
//                      Backend forwards to Zalo: https://business.openapi.zalo.me/message/template
const sendViaZNSApi = async (phone, templateId, params, config) => {
  // PLACEHOLDER — needs backend proxy. See Settings → "Hướng dẫn nâng cấp"
  if (!config?.zalo?.enabled) {
    throw new Error('ZNS chưa được bật. Vào Cài đặt để cấu hình.');
  }
  const res = await fetch('/api/send-zns', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phoneE164(phone), templateId, params })
  });
  if (!res.ok) throw new Error('Gửi ZNS thất bại');
  return res.json();
};

const sendViaSpeedSMSApi = async (phone, message, config) => {
  if (!config?.sms?.enabled) {
    throw new Error('SMS API chưa được bật. Vào Cài đặt để cấu hình.');
  }
  const res = await fetch('/api/send-sms', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phoneE164(phone), message, sender: config.sms.brandname })
  });
  if (!res.ok) throw new Error('Gửi SMS thất bại');
  return res.json();
};

// ============================================================
// EXPORT HELPERS — Excel / CSV / Google Sheets
// ============================================================
const buildReportSheets = ({ customers, orders, products, period, periodStart }) => {
  const periodOrders = orders.filter(o => new Date(o.date) >= periodStart);

  // Sheet 1: Tổng quan
  const totalRevenue = periodOrders.reduce((s, o) => s + o.total, 0);
  const summary = [
    { 'Chỉ số': 'Kỳ báo cáo',           'Giá trị': period === 'week' ? '7 ngày qua' : period === 'month' ? '30 ngày qua' : '90 ngày qua' },
    { 'Chỉ số': 'Tổng doanh thu (₫)',   'Giá trị': totalRevenue },
    { 'Chỉ số': 'Số đơn hàng',          'Giá trị': periodOrders.length },
    { 'Chỉ số': 'Đơn trung bình (₫)',   'Giá trị': periodOrders.length ? Math.round(totalRevenue / periodOrders.length) : 0 },
    { 'Chỉ số': 'Tổng số khách hàng',   'Giá trị': customers.length },
    { 'Chỉ số': 'Khách mới trong kỳ',   'Giá trị': customers.filter(c => new Date(c.createdAt) >= periodStart).length },
    { 'Chỉ số': 'Ngày xuất báo cáo',    'Giá trị': new Date().toLocaleString('vi-VN') }
  ];

  // Sheet 2: Khách hàng
  const customersData = customers.map(c => ({
    'Mã KH': c.id,
    'Tên': c.name,
    'SĐT': c.phone,
    'Email': c.email || '',
    'Địa chỉ': c.address || '',
    'Phân loại': TAGS[c.tag]?.label || c.tag,
    'Tổng chi tiêu (₫)': c.totalSpent,
    'Số đơn': c.orderCount,
    'Ngày tạo': c.createdAt,
    'Tương tác cuối': c.lastInteraction,
    'Ghi chú': c.notes || ''
  }));

  // Sheet 3: Đơn hàng
  const ordersData = periodOrders.map(o => {
    const cust = customers.find(c => c.id === o.customerId);
    const itemsStr = o.items.map(i => {
      const p = products.find(x => x.id === i.productId);
      return `${p?.name || i.productId} ×${i.qty}`;
    }).join(', ');
    return {
      'Mã đơn': o.id,
      'Ngày': o.date,
      'Khách': cust?.name || '',
      'SĐT': cust?.phone || '',
      'Sản phẩm': itemsStr,
      'Tổng (₫)': o.total,
      'Giảm giá (₫)': o.discount || 0,
      'Trạng thái': o.status,
      'Ghi chú': o.note || ''
    };
  });

  // Sheet 4: Doanh thu theo ngày
  const dayMap = {};
  periodOrders.forEach(o => {
    if (!dayMap[o.date]) dayMap[o.date] = { count: 0, revenue: 0 };
    dayMap[o.date].count++;
    dayMap[o.date].revenue += o.total;
  });
  const dailyData = Object.entries(dayMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, d]) => ({
      'Ngày': date,
      'Số đơn': d.count,
      'Doanh thu (₫)': d.revenue
    }));

  // Sheet 5: Top sản phẩm
  const productSales = {};
  periodOrders.forEach(o => o.items.forEach(it => {
    if (!productSales[it.productId]) productSales[it.productId] = { qty: 0, revenue: 0 };
    productSales[it.productId].qty += it.qty;
    productSales[it.productId].revenue += it.qty * it.price;
  }));
  const productsData = Object.entries(productSales)
    .map(([id, s]) => {
      const p = products.find(x => x.id === id);
      return {
        'Mã SP': id,
        'Tên sản phẩm': p?.name || id,
        'Số lượng bán': s.qty,
        'Doanh thu (₫)': s.revenue,
        'Giá đơn vị (₫)': p?.price || 0
      };
    })
    .sort((a, b) => b['Doanh thu (₫)'] - a['Doanh thu (₫)']);

  return { summary, customersData, ordersData, dailyData, productsData };
};

const exportToExcel = (data, filename) => {
  const wb = XLSX.utils.book_new();
  const sheets = [
    ['Tổng quan',         data.summary],
    ['Khách hàng',        data.customersData],
    ['Đơn hàng',          data.ordersData],
    ['Doanh thu theo ngày', data.dailyData],
    ['Sản phẩm',          data.productsData]
  ];
  sheets.forEach(([name, rows]) => {
    if (!rows.length) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    // Auto column widths
    const headers = Object.keys(rows[0]);
    ws['!cols'] = headers.map(h => {
      const maxLen = Math.max(
        h.length,
        ...rows.map(r => String(r[h] ?? '').length)
      );
      return { wch: Math.min(50, Math.max(10, maxLen + 2)) };
    });
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  XLSX.writeFile(wb, filename);
};

const copyTSVForGoogleSheets = data => {
  // Combine all sheets into one TSV with section headers
  const sections = [
    ['TỔNG QUAN',           data.summary],
    ['KHÁCH HÀNG',          data.customersData],
    ['ĐƠN HÀNG',            data.ordersData],
    ['DOANH THU THEO NGÀY', data.dailyData],
    ['SẢN PHẨM',            data.productsData]
  ];
  let tsv = '';
  sections.forEach(([title, rows]) => {
    if (!rows.length) return;
    tsv += `\n=== ${title} ===\n`;
    const headers = Object.keys(rows[0]);
    tsv += headers.join('\t') + '\n';
    rows.forEach(r => {
      tsv += headers.map(h => String(r[h] ?? '').replace(/[\t\n]/g, ' ')).join('\t') + '\n';
    });
  });
  return tsv.trim();
};

// ============================================================
// IMPORT HELPERS — Parse pasted data (CSV / TSV / Excel)
// ============================================================
const detectDelimiter = text => {
  const firstLine = text.split('\n')[0] || '';
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  const semi = (firstLine.match(/;/g) || []).length;
  if (tabs >= commas && tabs >= semi) return '\t';
  if (semi > commas) return ';';
  return ',';
};

const parsePastedData = text => {
  if (!text.trim()) return { headers: [], rows: [] };
  const delimiter = detectDelimiter(text);
  const result = Papa.parse(text.trim(), {
    delimiter,
    skipEmptyLines: true,
    header: false
  });
  const data = result.data;
  if (!data.length) return { headers: [], rows: [] };
  const headers = data[0].map(h => String(h).trim());
  const rows = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] != null ? String(row[i]).trim() : ''; });
    return obj;
  });
  return { headers, rows };
};

// Heuristic field matching for Vietnamese & English column names
const FIELD_MATCHERS = {
  customer: {
    name:    [/^t[eê]n/i, /^name/i, /^h[oọ]\s*t[eê]n/i, /full\s*name/i, /^kh[aá]ch/i],
    phone:   [/^s[dđ]t/i, /phone/i, /m[oòồ]bile/i, /^[dđ]i[eệ]n\s*tho[aạ]i/i, /^sdt/i],
    email:   [/^e?mail/i],
    address: [/^[dđ][iị]a\s*ch[iỉ]/i, /^address/i],
    notes:   [/^ghi\s*ch[uú]/i, /^note/i, /^l[uư]u\s*[yý]/i],
    tag:     [/^lo[aạ]i/i, /^ph[aâ]n\s*lo[aạ]i/i, /^tag/i, /^nh[oó]m/i]
  },
  product: {
    name:  [/^t[eê]n/i, /^name/i, /^s[aả]n\s*ph[aẩ]m/i, /^product/i],
    sku:   [/^m[aã]/i, /^sku/i, /^code/i, /^id/i],
    price: [/^gi[aá]/i, /^price/i, /^[dđ]\s*[oơ]n\s*gi[aá]/i]
  }
};

const matchField = (header, type) => {
  const matchers = FIELD_MATCHERS[type] || {};
  for (const [field, patterns] of Object.entries(matchers)) {
    if (patterns.some(p => p.test(header))) return field;
  }
  return null;
};

const guessTagFromText = text => {
  const t = text.toLowerCase();
  if (t.includes('vip') || t.includes('thân thiết')) return 'vip';
  if (t.includes('mới') || t.includes('new')) return 'new';
  if (t.includes('đàm phán') || t.includes('deal')) return 'deal';
  if (t.includes('csk') || t.includes('chăm sóc') || t.includes('care')) return 'care';
  if (t.includes('quen') || t.includes('regular')) return 'regular';
  if (t.includes('cũ') || t.includes('old')) return 'old';
  return null;
};

const parsePrice = val => {
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
};

// ============================================================
// PRIMITIVE UI COMPONENTS
// ============================================================
const Avatar = ({ name, tag, size = 40 }) => {
  const t = TAGS[tag] || TAGS.old;
  return (
    <div
      className="flex items-center justify-center font-medium shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: t.bg,
        color: t.fg,
        fontSize: size * 0.36,
        fontFamily: 'Instrument Serif, serif',
        fontStyle: 'italic',
        letterSpacing: '0.02em'
      }}
    >
      {getInitials(name)}
    </div>
  );
};

const StatusPill = ({ tag }) => {
  const t = TAGS[tag] || TAGS.old;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium"
      style={{
        background: t.bg,
        color: t.fg,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11,
        letterSpacing: '0.01em'
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: t.dot }} />
      {t.label}
    </span>
  );
};

const Btn = ({ variant = 'primary', size = 'md', children, className = '', ...props }) => {
  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-sm px-5 py-2.5'
  };
  const variants = {
    primary: { background: COLORS.jade,    color: '#fff',          border: 'none' },
    ghost:   { background: 'transparent',  color: COLORS.ink,      border: `0.5px solid ${COLORS.borderStrong}` },
    danger:  { background: 'transparent',  color: COLORS.rose,     border: `0.5px solid ${COLORS.rose}` },
    soft:    { background: COLORS.jadeSoft, color: COLORS.jadeDeep, border: 'none' }
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 font-medium transition-all ${sizes[size]} ${className}`}
      style={{ ...variants[variant], borderRadius: 8, fontFamily: 'inherit' }}
      onMouseEnter={e => { if (variant === 'primary') e.currentTarget.style.background = COLORS.jadeDeep; }}
      onMouseLeave={e => { if (variant === 'primary') e.currentTarget.style.background = COLORS.jade; }}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '', style = {}, ...props }) => (
  <div
    className={className}
    style={{
      background: COLORS.surface,
      border: `0.5px solid ${COLORS.border}`,
      borderRadius: 12,
      ...style
    }}
    {...props}
  >
    {children}
  </div>
);

const Input = ({ icon: Icon, ...props }) => (
  <div className="relative">
    {Icon && (
      <Icon
        size={16}
        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: COLORS.inkFaint }}
      />
    )}
    <input
      {...props}
      style={{
        width: '100%',
        padding: Icon ? '10px 12px 10px 38px' : '10px 12px',
        fontSize: 14,
        background: COLORS.surfaceAlt,
        border: `0.5px solid ${COLORS.border}`,
        borderRadius: 8,
        outline: 'none',
        color: COLORS.ink,
        fontFamily: 'inherit',
        ...props.style
      }}
      onFocus={e => { e.target.style.borderColor = COLORS.jade; e.target.style.background = COLORS.surface; }}
      onBlur={e => { e.target.style.borderColor = COLORS.border; e.target.style.background = COLORS.surfaceAlt; }}
    />
  </div>
);

const Modal = ({ open, onClose, title, children, maxWidth = 480 }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(31, 27, 22, 0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full"
        style={{
          maxWidth,
          background: COLORS.surface,
          borderRadius: 16,
          border: `0.5px solid ${COLORS.border}`,
          maxHeight: '90vh',
          overflow: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between"
          style={{ padding: '18px 20px', borderBottom: `0.5px solid ${COLORS.border}` }}
        >
          <div style={{ fontSize: 17, fontWeight: 500, color: COLORS.ink }}>{title}</div>
          <button
            onClick={onClose}
            className="flex items-center justify-center"
            style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: COLORS.inkSoft }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, delta, accent }) => (
  <Card style={{ padding: '14px 16px', borderColor: COLORS.border }}>
    <div style={{ fontSize: 11, color: COLORS.inkSoft, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 500 }}>
      {label}
    </div>
    <div
      style={{
        fontSize: 30,
        fontFamily: 'Instrument Serif, serif',
        fontStyle: 'italic',
        color: accent || COLORS.ink,
        lineHeight: 1.1,
        marginTop: 6,
        letterSpacing: '-0.01em'
      }}
    >
      {value}
    </div>
    {delta && (
      <div
        style={{
          fontSize: 11,
          color: delta.startsWith('+') ? COLORS.jade : COLORS.rose,
          marginTop: 4,
          fontWeight: 500
        }}
      >
        {delta} vs trước
      </div>
    )}
  </Card>
);

const EmptyState = ({ icon: Icon, title, subtitle, action }) => (
  <div className="flex flex-col items-center text-center" style={{ padding: '48px 24px' }}>
    <div
      className="flex items-center justify-center"
      style={{
        width: 56, height: 56, borderRadius: '50%',
        background: COLORS.bgAlt, color: COLORS.inkFaint, marginBottom: 16
      }}
    >
      <Icon size={24} />
    </div>
    <div style={{ fontSize: 15, fontWeight: 500, color: COLORS.ink, marginBottom: 4 }}>{title}</div>
    {subtitle && <div style={{ fontSize: 13, color: COLORS.inkSoft, maxWidth: 280, marginBottom: 16 }}>{subtitle}</div>}
    {action}
  </div>
);

// ============================================================
// MAIN APP
// ============================================================
export default function SalesApp() {
  const [view, setView]                       = useState('dashboard');
  const [loaded, setLoaded]                   = useState(false);
  const [customers, setCustomers]             = useState([]);
  const [products, setProducts]                = useState(SAMPLE_PRODUCTS);
  const [orders, setOrders]                   = useState([]);
  const [reminders, setReminders]             = useState([]);
  const [interactions, setInteractions]       = useState([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [editingCustomer, setEditingCustomer]       = useState(null);
  const [addingCustomer, setAddingCustomer]         = useState(false);
  const [addingReminder, setAddingReminder]         = useState(false);
  const [orderCustomerId, setOrderCustomerId]       = useState(null);
  const [cart, setCart]                             = useState([]);
  const [orderDiscount, setOrderDiscount]           = useState(0);
  const [orderNote, setOrderNote]                   = useState('');
  const [orderSuccess, setOrderSuccess]             = useState(null);

  // Messaging state
  const [messageTemplates, setMessageTemplates] = useState(DEFAULT_TEMPLATES);
  const [apiConfig, setApiConfig]               = useState(DEFAULT_API_CONFIG);
  const [showSettings, setShowSettings]         = useState(false);
  const [sendingMessage, setSendingMessage]     = useState(null); // { customer, channel, ctx }
  const [bulkMode, setBulkMode]                 = useState(false);
  const [selectedIds, setSelectedIds]           = useState([]);
  const [showBulkSend, setShowBulkSend]         = useState(false);

  // Import / Export state
  const [showImport, setShowImport] = useState(null); // 'customers' | 'products' | null
  const [showExport, setShowExport] = useState(false);

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2400);
  };

  // ---- Load from persistent storage ----
  useEffect(() => {
    (async () => {
      try {
        const tryGet = async (k, fallback) => {
          try {
            const r = await storage.get(k);
            return r?.value ? JSON.parse(r.value) : fallback;
          } catch { return fallback; }
        };
        setCustomers(await tryGet('sa_customers', SAMPLE_CUSTOMERS));
        setProducts(await tryGet('sa_products', SAMPLE_PRODUCTS));
        setOrders(await tryGet('sa_orders', SAMPLE_ORDERS));
        setReminders(await tryGet('sa_reminders', SAMPLE_REMINDERS));
        setInteractions(await tryGet('sa_interactions', SAMPLE_INTERACTIONS));
        setMessageTemplates(await tryGet('sa_templates', DEFAULT_TEMPLATES));
        setApiConfig(await tryGet('sa_config', DEFAULT_API_CONFIG));
      } catch {
        setCustomers(SAMPLE_CUSTOMERS);
        setOrders(SAMPLE_ORDERS);
        setReminders(SAMPLE_REMINDERS);
        setInteractions(SAMPLE_INTERACTIONS);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // ---- Save to persistent storage ----
  useEffect(() => { if (loaded) storage.set('sa_customers',    JSON.stringify(customers)).catch(()=>{}); }, [customers, loaded]);
  useEffect(() => { if (loaded) storage.set('sa_products',     JSON.stringify(products)).catch(()=>{});  }, [products, loaded]);
  useEffect(() => { if (loaded) storage.set('sa_orders',       JSON.stringify(orders)).catch(()=>{});    }, [orders, loaded]);
  useEffect(() => { if (loaded) storage.set('sa_reminders',    JSON.stringify(reminders)).catch(()=>{}); }, [reminders, loaded]);
  useEffect(() => { if (loaded) storage.set('sa_interactions', JSON.stringify(interactions)).catch(()=>{}); }, [interactions, loaded]);
  useEffect(() => { if (loaded) storage.set('sa_templates',    JSON.stringify(messageTemplates)).catch(()=>{}); }, [messageTemplates, loaded]);
  useEffect(() => { if (loaded) storage.set('sa_config',       JSON.stringify(apiConfig)).catch(()=>{}); }, [apiConfig, loaded]);

  // ---- Messaging handlers ----
  const openSendMessage = (customer, channel = 'zalo', ctx = {}) => {
    setSendingMessage({ customer, channel, ctx });
  };

  const recordMessageSent = (customerId, channel, message) => {
    const today = new Date().toISOString().slice(0, 10);
    const channelLabel = channel === 'zalo' ? 'Zalo' : 'SMS';
    const preview = message.length > 80 ? message.slice(0, 80) + '…' : message;

    setInteractions(is => [{
      id: genId(), customerId, type: 'msg',
      note: `[${channelLabel}] ${preview}`, date: today
    }, ...is]);

    setCustomers(cs => cs.map(c => c.id === customerId
      ? { ...c, lastInteraction: today }
      : c
    ));
  };

  const handleSendMessage = (channel, message) => {
    if (!sendingMessage) return;
    const { customer } = sendingMessage;
    if (channel === 'zalo') sendViaZalo(customer.phone, message);
    else sendViaSMS(customer.phone, message);
    recordMessageSent(customer.id, channel, message);
    setSendingMessage(null);
    showToast(channel === 'zalo' ? 'Đã copy tin & mở Zalo' : 'Đang mở ứng dụng SMS');
  };

  const toggleSelectId = id => {
    setSelectedIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const exitBulkMode = () => {
    setBulkMode(false);
    setSelectedIds([]);
  };

  // ---- Import handlers ----
  const handleImportCustomers = (newRows, replace) => {
    const newCustomers = newRows.map(r => ({
      id: genId(),
      name: r.name || '',
      phone: r.phone || '',
      email: r.email || '',
      address: r.address || '',
      tag: r.tag || 'new',
      notes: r.notes || '',
      totalSpent: r.totalSpent || 0,
      orderCount: r.orderCount || 0,
      createdAt: r.createdAt || new Date().toISOString().slice(0, 10),
      lastInteraction: r.lastInteraction || new Date().toISOString().slice(0, 10)
    })).filter(c => c.name && c.phone);

    setCustomers(cs => replace ? newCustomers : [...newCustomers, ...cs]);
    showToast(`Đã import ${newCustomers.length} khách hàng`);
    setShowImport(null);
  };

  const handleImportProducts = (newRows, replace) => {
    const newProducts = newRows.map(r => ({
      id: 'p_' + genId(),
      name: r.name || '',
      sku: r.sku || ('SKU-' + Math.random().toString(36).slice(2, 6).toUpperCase()),
      price: r.price || 0
    })).filter(p => p.name);

    setProducts(ps => replace ? newProducts : [...newProducts, ...ps]);
    showToast(`Đã import ${newProducts.length} sản phẩm`);
    setShowImport(null);
  };

  const selectedCustomer = useMemo(
    () => customers.find(c => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  // ---- Customer operations ----
  const saveCustomer = data => {
    if (data.id) {
      setCustomers(cs => cs.map(c => c.id === data.id ? { ...c, ...data } : c));
      showToast('Đã cập nhật khách hàng');
    } else {
      const newC = { ...data, id: genId(), totalSpent: 0, orderCount: 0, createdAt: new Date().toISOString().slice(0,10), lastInteraction: new Date().toISOString().slice(0,10) };
      setCustomers(cs => [newC, ...cs]);
      showToast('Đã thêm khách hàng');
    }
    setAddingCustomer(false);
    setEditingCustomer(null);
  };

  const deleteCustomer = id => {
    if (!confirm('Xoá khách hàng này? Toàn bộ lịch sử sẽ bị xoá.')) return;
    setCustomers(cs => cs.filter(c => c.id !== id));
    setInteractions(is => is.filter(i => i.customerId !== id));
    setReminders(rs => rs.filter(r => r.customerId !== id));
    setSelectedCustomerId(null);
    showToast('Đã xoá khách hàng');
  };

  // ---- Order operations ----
  const addToCart = product => {
    setCart(c => {
      const existing = c.find(i => i.productId === product.id);
      if (existing) return c.map(i => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { productId: product.id, name: product.name, price: product.price, qty: 1 }];
    });
  };

  const updateCartQty = (productId, delta) => {
    setCart(c => c.flatMap(i => {
      if (i.productId !== productId) return [i];
      const newQty = i.qty + delta;
      return newQty <= 0 ? [] : [{ ...i, qty: newQty }];
    }));
  };

  const cartSubtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartTotal = Math.max(0, cartSubtotal - orderDiscount);

  const submitOrder = () => {
    if (!orderCustomerId || !cart.length) return;
    const newOrder = {
      id: genId(),
      customerId: orderCustomerId,
      items: cart.map(i => ({ productId: i.productId, qty: i.qty, price: i.price })),
      total: cartTotal,
      discount: orderDiscount,
      note: orderNote,
      status: 'completed',
      date: new Date().toISOString().slice(0, 10)
    };
    setOrders(o => [newOrder, ...o]);

    setCustomers(cs => cs.map(c => c.id === orderCustomerId
      ? { ...c, totalSpent: c.totalSpent + cartTotal, orderCount: c.orderCount + 1, lastInteraction: newOrder.date }
      : c
    ));

    setInteractions(is => [{
      id: genId(), customerId: orderCustomerId, type: 'order',
      note: `Đặt đơn mới — ${fmtVND(cartTotal)}`, date: newOrder.date
    }, ...is]);

    const cust = customers.find(c => c.id === orderCustomerId);
    setOrderSuccess({ customer: cust?.name || '', total: cartTotal });
    setCart([]);
    setOrderDiscount(0);
    setOrderNote('');
    setOrderCustomerId(null);
  };

  // ---- Reminder operations ----
  const toggleReminder = id => {
    setReminders(rs => rs.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
  };

  const addReminder = data => {
    const newR = { ...data, id: genId(), completed: false };
    setReminders(rs => [newR, ...rs]);
    setAddingReminder(false);
    showToast('Đã thêm nhắc nhở');
  };

  const deleteReminder = id => {
    setReminders(rs => rs.filter(r => r.id !== id));
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, color: COLORS.ink, fontFamily: '"Be Vietnam Pro", system-ui, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
        * { box-sizing: border-box; }
        body { font-family: "Be Vietnam Pro", system-ui, sans-serif; }
        .scrollable::-webkit-scrollbar { width: 8px; height: 8px; }
        .scrollable::-webkit-scrollbar-track { background: transparent; }
        .scrollable::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 4px; }
        .row-hover:hover { background: ${COLORS.surfaceAlt}; }
        .nav-item { transition: all 0.15s ease; }
        .nav-item:hover { background: ${COLORS.bgAlt}; }
        .nav-item-active { background: ${COLORS.ink} !important; color: ${COLORS.bg} !important; }
        .fadeIn { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .toast-anim { animation: slideUp 0.3s ease; }
        select:focus, textarea:focus { outline: none; border-color: ${COLORS.jade}; }
      `}</style>

      <div className="flex" style={{ minHeight: '100vh' }}>
        {/* SIDEBAR (desktop) */}
        <aside
          className="hidden md:flex flex-col shrink-0"
          style={{
            width: 240,
            borderRight: `0.5px solid ${COLORS.border}`,
            background: COLORS.bg,
            position: 'sticky',
            top: 0,
            height: '100vh',
            padding: '24px 16px'
          }}
        >
          <div style={{ padding: '0 8px 24px', borderBottom: `0.5px solid ${COLORS.border}`, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: COLORS.jade,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Sparkles size={16} color="#fff" />
              </div>
              <div>
                <div style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', fontSize: 20, lineHeight: 1, color: COLORS.ink }}>
                  Sổ bán hàng
                </div>
                <div style={{ fontSize: 10, color: COLORS.inkFaint, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
                  v1.0 · Demo
                </div>
              </div>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {[
              { id: 'dashboard', icon: Home,      label: 'Trang chủ' },
              { id: 'customers', icon: Users,     label: 'Khách hàng', badge: customers.length },
              { id: 'order',     icon: Plus,      label: 'Đơn mới' },
              { id: 'reminders', icon: Bell,      label: 'Nhắc nhở',   badge: reminders.filter(r => !r.completed).length },
              { id: 'reports',   icon: BarChart3, label: 'Báo cáo' }
            ].map(item => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${active ? 'nav-item-active' : ''}`}
                  onClick={() => { setView(item.id); setSelectedCustomerId(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 8,
                    border: 'none', background: 'transparent',
                    color: active ? COLORS.bg : COLORS.ink,
                    fontSize: 14, fontWeight: active ? 500 : 400,
                    cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'inherit', width: '100%'
                  }}
                >
                  <item.icon size={17} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span style={{
                      fontSize: 10, padding: '1px 6px', borderRadius: 999,
                      background: active ? 'rgba(255,255,255,0.2)' : COLORS.bgAlt,
                      color: active ? COLORS.bg : COLORS.inkSoft, fontWeight: 500
                    }}>{item.badge}</span>
                  )}
                </button>
              );
            })}
          </nav>

          <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: `0.5px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px' }}>
              <Avatar name={apiConfig.userName || 'B'} tag="regular" size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.ink }}>
                  {apiConfig.userName || 'Chưa đặt tên'}
                </div>
                <div style={{ fontSize: 11, color: COLORS.inkSoft }}>{apiConfig.shopName}</div>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                title="Cài đặt"
                style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  background: 'transparent', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: COLORS.inkSoft
                }}
                onMouseEnter={e => { e.currentTarget.style.background = COLORS.bgAlt; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Settings size={16} />
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 flex flex-col" style={{ minWidth: 0, paddingBottom: 80 }}>
          {/* MOBILE HEADER */}
          <header
            className="md:hidden flex items-center justify-between"
            style={{
              padding: '16px 18px',
              borderBottom: `0.5px solid ${COLORS.border}`,
              background: COLORS.bg,
              position: 'sticky', top: 0, zIndex: 10
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: COLORS.jade, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={14} color="#fff" />
              </div>
              <div style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', fontSize: 18, color: COLORS.ink }}>
                Sổ bán hàng
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setShowSettings(true)}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  background: 'transparent', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: COLORS.inkSoft
                }}
              >
                <Settings size={16} />
              </button>
              <Avatar name={apiConfig.userName || 'B'} tag="regular" size={32} />
            </div>
          </header>

          {/* VIEWS */}
          <div className="fadeIn" style={{ flex: 1, padding: '24px 20px', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
            {view === 'dashboard' && (
              <DashboardView
                customers={customers}
                orders={orders}
                reminders={reminders}
                userName={apiConfig.userName}
                onOpenCustomer={id => { setSelectedCustomerId(id); setView('customers'); }}
                onGotoView={v => setView(v)}
                onAddCustomer={() => setAddingCustomer(true)}
              />
            )}

            {view === 'customers' && !selectedCustomer && (
              <CustomersView
                customers={customers}
                onOpen={id => setSelectedCustomerId(id)}
                onAdd={() => setAddingCustomer(true)}
                onImport={() => setShowImport('customers')}
              />
            )}

            {view === 'customers' && selectedCustomer && (
              <CustomerDetailView
                customer={selectedCustomer}
                orders={orders.filter(o => o.customerId === selectedCustomer.id)}
                interactions={interactions.filter(i => i.customerId === selectedCustomer.id)}
                reminders={reminders.filter(r => r.customerId === selectedCustomer.id)}
                products={products}
                onBack={() => setSelectedCustomerId(null)}
                onEdit={() => setEditingCustomer(selectedCustomer)}
                onDelete={() => deleteCustomer(selectedCustomer.id)}
                onCreateOrder={() => { setOrderCustomerId(selectedCustomer.id); setView('order'); }}
                onAddReminder={() => setAddingReminder(true)}
                onSendMessage={(channel) => openSendMessage(selectedCustomer, channel)}
                onCall={() => callNumber(selectedCustomer.phone)}
              />
            )}

            {view === 'order' && (
              <OrderView
                customers={customers}
                products={products}
                cart={cart}
                orderCustomerId={orderCustomerId}
                orderDiscount={orderDiscount}
                orderNote={orderNote}
                orderSuccess={orderSuccess}
                onSetCustomer={setOrderCustomerId}
                onAddToCart={addToCart}
                onUpdateQty={updateCartQty}
                onSetDiscount={setOrderDiscount}
                onSetNote={setOrderNote}
                onSubmit={submitOrder}
                onClearSuccess={() => setOrderSuccess(null)}
                onAddCustomer={() => setAddingCustomer(true)}
              />
            )}

            {view === 'reminders' && (
              <RemindersView
                reminders={reminders}
                customers={customers}
                onToggle={toggleReminder}
                onDelete={deleteReminder}
                onAdd={() => setAddingReminder(true)}
                onOpenCustomer={id => { setSelectedCustomerId(id); setView('customers'); }}
              />
            )}

            {view === 'reports' && (
              <ReportsView
                orders={orders}
                customers={customers}
                products={products}
                onExport={() => setShowExport(true)}
                onImportProducts={() => setShowImport('products')}
              />
            )}
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0"
        style={{
          background: COLORS.surface,
          borderTop: `0.5px solid ${COLORS.border}`,
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          zIndex: 20, paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      >
        {[
          { id: 'dashboard', icon: Home,      label: 'Trang chủ' },
          { id: 'customers', icon: Users,     label: 'Khách' },
          { id: 'order',     icon: Plus,      label: 'Đơn mới' },
          { id: 'reminders', icon: Bell,      label: 'Nhắc' },
          { id: 'reports',   icon: BarChart3, label: 'Báo cáo' }
        ].map(item => {
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setView(item.id); setSelectedCustomerId(null); }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 4, padding: '10px 4px 8px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: active ? COLORS.jade : COLORS.inkSoft,
                fontSize: 10, fontFamily: 'inherit'
              }}
            >
              <item.icon size={20} strokeWidth={active ? 2 : 1.6} />
              <span style={{ fontWeight: active ? 500 : 400 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* MODALS */}
      {(addingCustomer || editingCustomer) && (
        <CustomerFormModal
          customer={editingCustomer}
          onSave={saveCustomer}
          onClose={() => { setAddingCustomer(false); setEditingCustomer(null); }}
        />
      )}

      {addingReminder && (
        <ReminderFormModal
          customers={customers}
          defaultCustomerId={selectedCustomerId}
          onSave={addReminder}
          onClose={() => setAddingReminder(false)}
        />
      )}

      {sendingMessage && (
        <SendMessageModal
          customer={sendingMessage.customer}
          defaultChannel={sendingMessage.channel}
          ctx={{ ...sendingMessage.ctx, shopName: apiConfig.shopName }}
          templates={messageTemplates}
          onSend={handleSendMessage}
          onClose={() => setSendingMessage(null)}
        />
      )}

      {showSettings && (
        <SettingsModal
          templates={messageTemplates}
          onSaveTemplates={setMessageTemplates}
          config={apiConfig}
          onSaveConfig={setApiConfig}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showImport === 'customers' && (
        <ImportDataModal
          type="customers"
          existingCount={customers.length}
          onImport={handleImportCustomers}
          onClose={() => setShowImport(null)}
        />
      )}

      {showImport === 'products' && (
        <ImportDataModal
          type="products"
          existingCount={products.length}
          onImport={handleImportProducts}
          onClose={() => setShowImport(null)}
        />
      )}

      {showExport && (
        <ExportModal
          customers={customers}
          orders={orders}
          products={products}
          onClose={() => setShowExport(false)}
          onToast={showToast}
        />
      )}

      {/* TOAST */}
      {toast && (
        <div
          className="toast-anim fixed"
          style={{
            bottom: 90, left: '50%', transform: 'translateX(-50%)',
            background: COLORS.ink, color: COLORS.bg,
            padding: '10px 18px', borderRadius: 999,
            fontSize: 13, fontWeight: 500, zIndex: 100,
            display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <CheckCircle2 size={15} color={COLORS.jadeSoft} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ============================================================
// DASHBOARD VIEW
// ============================================================
function DashboardView({ customers, orders, reminders, userName, onOpenCustomer, onGotoView, onAddCustomer }) {
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders   = orders.filter(o => o.date === today);
  const todayRevenue  = todayOrders.reduce((s, o) => s + o.total, 0);
  const newToday      = customers.filter(c => c.createdAt === today).length;
  const todoCount     = reminders.filter(r => !r.completed).length;
  const careCustomers = customers.filter(c => c.tag === 'care' || c.tag === 'deal').slice(0, 4);
  const todayReminders = reminders
    .filter(r => !r.completed && isSameDay(r.dueDate, new Date()))
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 4);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Chào buổi sáng' : now.getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const dayName = ['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'][now.getDay()];
  const greetingFull = userName ? `${greeting}, ${userName}` : greeting;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: COLORS.inkSoft, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 500 }}>
          {dayName} · {formatDateVN(today)}
        </div>
        <h1 style={{
          fontFamily: 'Instrument Serif, serif',
          fontStyle: 'italic',
          fontSize: 36, fontWeight: 400,
          margin: '4px 0 0', color: COLORS.ink, letterSpacing: '-0.01em'
        }}>
          {greetingFull}
        </h1>
        <div style={{ fontSize: 14, color: COLORS.inkSoft, marginTop: 4 }}>
          Hôm nay bạn có <span style={{ color: COLORS.persimmon, fontWeight: 500 }}>{todoCount} việc</span> cần làm
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard label="Đơn hôm nay"  value={todayOrders.length} delta="+3" />
        <StatCard label="Doanh số"     value={fmtVNDShort(todayRevenue)} delta="+18%" accent={COLORS.jade} />
        <StatCard label="Khách mới"    value={newToday} />
        <StatCard label="Việc cần làm" value={todoCount} accent={todoCount > 5 ? COLORS.persimmon : COLORS.ink} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Today reminders */}
        <Card style={{ padding: 0 }}>
          <div style={{ padding: '16px 18px', borderBottom: `0.5px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Nhắc nhở hôm nay</div>
              <div style={{ fontSize: 11, color: COLORS.inkFaint }}>{todayReminders.length} việc</div>
            </div>
            <button
              onClick={() => onGotoView('reminders')}
              style={{ fontSize: 12, color: COLORS.jade, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Xem hết <ArrowUpRight size={12} />
            </button>
          </div>
          <div>
            {todayReminders.length === 0 ? (
              <div style={{ padding: '24px 18px', textAlign: 'center', color: COLORS.inkFaint, fontSize: 13 }}>
                Hôm nay không có việc gì 🌿
              </div>
            ) : todayReminders.map(r => {
              const c = customers.find(x => x.id === r.customerId);
              return (
                <div
                  key={r.id}
                  className="row-hover"
                  style={{
                    padding: '12px 18px', display: 'flex', gap: 12, alignItems: 'flex-start',
                    borderBottom: `0.5px solid ${COLORS.border}`, cursor: 'pointer'
                  }}
                  onClick={() => c && onOpenCustomer(c.id)}
                >
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                    color: r.urgent ? COLORS.persimmon : COLORS.jade,
                    background: r.urgent ? COLORS.persimmonSoft : COLORS.jadeSoft,
                    padding: '3px 8px', borderRadius: 4, fontWeight: 500
                  }}>
                    {formatTime(r.dueDate)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: COLORS.ink, lineHeight: 1.4 }}>{r.task}</div>
                    {c && <div style={{ fontSize: 11, color: COLORS.inkSoft, marginTop: 2 }}>{c.name}</div>}
                  </div>
                  {r.urgent && <AlertCircle size={14} color={COLORS.persimmon} />}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Care customers */}
        <Card style={{ padding: 0 }}>
          <div style={{ padding: '16px 18px', borderBottom: `0.5px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Khách cần chăm sóc</div>
              <div style={{ fontSize: 11, color: COLORS.inkFaint }}>Sắp xếp theo độ ưu tiên</div>
            </div>
            <button
              onClick={() => onGotoView('customers')}
              style={{ fontSize: 12, color: COLORS.jade, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Tất cả <ArrowUpRight size={12} />
            </button>
          </div>
          <div>
            {careCustomers.map(c => (
              <div
                key={c.id}
                className="row-hover"
                onClick={() => onOpenCustomer(c.id)}
                style={{
                  padding: '12px 18px', display: 'flex', gap: 12, alignItems: 'center',
                  borderBottom: `0.5px solid ${COLORS.border}`, cursor: 'pointer'
                }}
              >
                <Avatar name={c.name} tag={c.tag} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.inkSoft, marginTop: 1 }}>
                    {formatRelative(c.lastInteraction)} · {fmtVNDShort(c.totalSpent)} ₫
                  </div>
                </div>
                <StatusPill tag={c.tag} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Btn variant="primary" onClick={() => onGotoView('order')}>
          <Plus size={15} /> Tạo đơn mới
        </Btn>
        <Btn variant="ghost" onClick={onAddCustomer}>
          <Users size={15} /> Thêm khách hàng
        </Btn>
      </div>
    </div>
  );
}

// ============================================================
// CUSTOMERS LIST VIEW
// ============================================================
function CustomersView({ customers, onOpen, onAdd, onImport }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  const filtered = useMemo(() => {
    let list = customers;
    if (filter !== 'all') list = list.filter(c => c.tag === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
      );
    }
    list = [...list].sort((a, b) => {
      if (sortBy === 'name')  return a.name.localeCompare(b.name, 'vi');
      if (sortBy === 'value') return b.totalSpent - a.totalSpent;
      return new Date(b.lastInteraction) - new Date(a.lastInteraction);
    });
    return list;
  }, [customers, search, filter, sortBy]);

  const filters = [
    ['all', 'Tất cả', customers.length],
    ['vip', 'VIP', customers.filter(c => c.tag === 'vip').length],
    ['new', 'Mới', customers.filter(c => c.tag === 'new').length],
    ['deal', 'Đàm phán', customers.filter(c => c.tag === 'deal').length],
    ['care', 'Cần CSKH', customers.filter(c => c.tag === 'care').length],
    ['regular', 'Khách quen', customers.filter(c => c.tag === 'regular').length],
    ['old', 'Khách cũ', customers.filter(c => c.tag === 'old').length]
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', fontSize: 32, fontWeight: 400, margin: 0, color: COLORS.ink }}>
            Khách hàng
          </h1>
          <div style={{ fontSize: 13, color: COLORS.inkSoft, marginTop: 4 }}>
            {customers.length} người · Tổng giá trị {fmtVNDShort(customers.reduce((s, c) => s + c.totalSpent, 0))} ₫
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" onClick={onImport}>
            <Upload size={15} /> Import
          </Btn>
          <Btn variant="primary" onClick={onAdd}>
            <Plus size={15} /> Thêm khách hàng
          </Btn>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Input
            icon={Search}
            placeholder="Tìm theo tên, số điện thoại, ghi chú..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{
            padding: '10px 14px', fontSize: 13, background: COLORS.surfaceAlt,
            border: `0.5px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.ink,
            fontFamily: 'inherit', cursor: 'pointer'
          }}
        >
          <option value="recent">Mới tương tác</option>
          <option value="value">Giá trị cao</option>
          <option value="name">Tên A-Z</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {filters.map(([k, label, count]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            style={{
              fontSize: 12,
              padding: '6px 12px',
              borderRadius: 999,
              border: `0.5px solid ${filter === k ? COLORS.ink : COLORS.border}`,
              background: filter === k ? COLORS.ink : 'transparent',
              color: filter === k ? COLORS.bg : COLORS.inkSoft,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 6
            }}
          >
            {label}
            <span style={{ fontSize: 10, opacity: 0.7 }}>{count}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="Chưa có khách hàng phù hợp"
            subtitle="Thử thay đổi bộ lọc hoặc thêm khách hàng mới."
            action={<Btn variant="primary" size="sm" onClick={onAdd}><Plus size={14} /> Thêm khách hàng</Btn>}
          />
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.map((c, i) => (
            <div
              key={c.id}
              className="row-hover"
              onClick={() => onOpen(c.id)}
              style={{
                padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'center',
                borderBottom: i < filtered.length - 1 ? `0.5px solid ${COLORS.border}` : 'none',
                cursor: 'pointer'
              }}
            >
              <Avatar name={c.name} tag={c.tag} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: COLORS.ink }}>{c.name}</span>
                  <StatusPill tag={c.tag} />
                </div>
                <div style={{ fontSize: 12, color: COLORS.inkSoft, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{c.phone}</span>
                  <span>·</span>
                  <span>Tương tác {formatRelative(c.lastInteraction)}</span>
                </div>
              </div>
              <div className="hidden sm:block" style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
                  fontSize: 18, color: COLORS.ink, lineHeight: 1
                }}>
                  {fmtVNDShort(c.totalSpent)} ₫
                </div>
                <div style={{ fontSize: 11, color: COLORS.inkFaint, marginTop: 3 }}>
                  {c.orderCount} đơn
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ============================================================
// CUSTOMER DETAIL VIEW
// ============================================================
function CustomerDetailView({ customer, orders, interactions, reminders, products, onBack, onEdit, onDelete, onCreateOrder, onAddReminder, onSendMessage, onCall }) {
  const [tab, setTab] = useState('history');
  const c = customer;
  const tag = TAGS[c.tag];

  const allEvents = [
    ...interactions.map(i => ({ ...i, sortDate: i.date })),
    ...orders.map(o => ({ id: o.id, type: 'order', note: `Đơn ${fmtVND(o.total)} — ${o.items.length} sản phẩm`, date: o.date, sortDate: o.date }))
  ].sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));

  const typeIcon = { order: ShoppingBag, call: Phone, msg: MessageCircle, note: FileText };
  const typeLabel = { order: 'Đặt đơn', call: 'Cuộc gọi', msg: 'Tin nhắn', note: 'Ghi chú' };
  const typeColor = { order: COLORS.jade, call: COLORS.ocean, msg: COLORS.plum, note: COLORS.amber };

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: COLORS.inkSoft, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
          padding: 0, marginBottom: 20, fontFamily: 'inherit'
        }}
      >
        <ChevronLeft size={16} /> Quay lại danh sách
      </button>

      <Card style={{ padding: '24px 24px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Avatar name={c.name} tag={c.tag} size={72} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <h1 style={{
                fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
                fontSize: 30, fontWeight: 400, margin: 0, color: COLORS.ink
              }}>
                {c.name}
              </h1>
              <StatusPill tag={c.tag} />
            </div>
            <div style={{ fontSize: 13, color: COLORS.inkSoft, display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone size={13} /> <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{c.phone}</span>
              </span>
              {c.email && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={13} /> {c.email}
                </span>
              )}
              {c.address && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={13} /> {c.address}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onEdit}
              style={{
                width: 36, height: 36, borderRadius: 8, border: `0.5px solid ${COLORS.border}`,
                background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: COLORS.inkSoft
              }}
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={onDelete}
              style={{
                width: 36, height: 36, borderRadius: 8, border: `0.5px solid ${COLORS.border}`,
                background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: COLORS.rose
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginTop: 20 }}>
          <div style={{ padding: '12px 14px', background: COLORS.bgAlt, borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Tổng chi tiêu</div>
            <div style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', fontSize: 22, color: COLORS.jadeDeep, marginTop: 2 }}>
              {fmtVNDShort(c.totalSpent)} ₫
            </div>
          </div>
          <div style={{ padding: '12px 14px', background: COLORS.bgAlt, borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Số đơn</div>
            <div style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', fontSize: 22, color: COLORS.ink, marginTop: 2 }}>
              {c.orderCount}
            </div>
          </div>
          <div style={{ padding: '12px 14px', background: COLORS.bgAlt, borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Khách từ</div>
            <div style={{ fontSize: 14, color: COLORS.ink, marginTop: 6, fontWeight: 500 }}>
              {formatDateVN(c.createdAt)}
            </div>
          </div>
          <div style={{ padding: '12px 14px', background: COLORS.bgAlt, borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Tương tác cuối</div>
            <div style={{ fontSize: 14, color: COLORS.ink, marginTop: 6, fontWeight: 500 }}>
              {formatRelative(c.lastInteraction)}
            </div>
          </div>
        </div>

        {c.notes && (
          <div style={{
            marginTop: 16, padding: '12px 14px',
            background: COLORS.amberSoft, borderRadius: 8,
            display: 'flex', gap: 10, alignItems: 'flex-start'
          }}>
            <FileText size={14} style={{ color: COLORS.amber, marginTop: 2, flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: COLORS.amber, lineHeight: 1.5 }}>{c.notes}</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
          <Btn variant="primary" onClick={onCreateOrder}><Plus size={14} /> Lên đơn ngay</Btn>
          <Btn variant="soft" onClick={() => onSendMessage('zalo')}><MessageSquare size={14} /> Gửi Zalo</Btn>
          <Btn variant="soft" onClick={() => onSendMessage('sms')}><Smartphone size={14} /> Gửi SMS</Btn>
          <Btn variant="ghost" onClick={onCall}><Phone size={14} /> Gọi</Btn>
          <Btn variant="ghost" onClick={onAddReminder}><Bell size={14} /> Nhắc nhở</Btn>
        </div>
      </Card>

      <Card style={{ padding: 0 }}>
        <div style={{ display: 'flex', borderBottom: `0.5px solid ${COLORS.border}` }}>
          {[
            ['history', `Lịch sử (${allEvents.length})`],
            ['orders',  `Đơn hàng (${orders.length})`],
            ['reminders', `Nhắc nhở (${reminders.length})`]
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                padding: '14px 20px', background: 'transparent', border: 'none',
                cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                color: tab === k ? COLORS.ink : COLORS.inkSoft,
                borderBottom: tab === k ? `2px solid ${COLORS.jade}` : '2px solid transparent',
                fontWeight: tab === k ? 500 : 400, marginBottom: -1
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="fadeIn">
          {tab === 'history' && (
            allEvents.length === 0 ? (
              <EmptyState icon={Clock} title="Chưa có tương tác nào" subtitle="Lịch sử sẽ xuất hiện khi bạn bắt đầu làm việc với khách." />
            ) : allEvents.map((ev, i) => {
              const Icon = typeIcon[ev.type] || FileText;
              return (
                <div
                  key={ev.id}
                  style={{
                    padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'flex-start',
                    borderBottom: i < allEvents.length - 1 ? `0.5px solid ${COLORS.border}` : 'none'
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: typeColor[ev.type] + '15',
                    color: typeColor[ev.type],
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Icon size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500, marginBottom: 2 }}>
                      {typeLabel[ev.type]} · {formatRelative(ev.date)}
                    </div>
                    <div style={{ fontSize: 13, color: COLORS.ink, lineHeight: 1.5 }}>{ev.note}</div>
                  </div>
                </div>
              );
            })
          )}

          {tab === 'orders' && (
            orders.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Khách chưa đặt đơn nào"
                action={<Btn variant="primary" size="sm" onClick={onCreateOrder}><Plus size={14} /> Tạo đơn đầu tiên</Btn>}
              />
            ) : orders.map((o, i) => (
              <div
                key={o.id}
                style={{
                  padding: '14px 18px', borderBottom: i < orders.length - 1 ? `0.5px solid ${COLORS.border}` : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Đơn {o.id.slice(0, 6).toUpperCase()}</div>
                    <div style={{ fontSize: 11, color: COLORS.inkSoft }}>{formatDateVN(o.date)}</div>
                  </div>
                  <div style={{
                    fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
                    fontSize: 18, color: COLORS.jadeDeep
                  }}>
                    {fmtVND(o.total)}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: COLORS.inkSoft }}>
                  {o.items.map(it => {
                    const p = products.find(x => x.id === it.productId);
                    return p ? `${p.name} ×${it.qty}` : '';
                  }).filter(Boolean).join(' · ')}
                </div>
                {o.note && (
                  <div style={{ fontSize: 12, color: COLORS.inkSoft, marginTop: 4, fontStyle: 'italic' }}>
                    "{o.note}"
                  </div>
                )}
              </div>
            ))
          )}

          {tab === 'reminders' && (
            reminders.length === 0 ? (
              <EmptyState icon={Bell} title="Không có nhắc nhở" action={<Btn variant="primary" size="sm" onClick={onAddReminder}><Plus size={14} /> Tạo nhắc nhở</Btn>} />
            ) : reminders.map((r, i) => (
              <div
                key={r.id}
                style={{
                  padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center',
                  borderBottom: i < reminders.length - 1 ? `0.5px solid ${COLORS.border}` : 'none'
                }}
              >
                {r.completed ? <CheckCircle2 size={18} color={COLORS.jade} /> : <Circle size={18} color={COLORS.inkFaint} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: r.completed ? COLORS.inkFaint : COLORS.ink, textDecoration: r.completed ? 'line-through' : 'none' }}>
                    {r.task}
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.inkSoft, marginTop: 2 }}>
                    {formatDateVN(r.dueDate)} · {formatTime(r.dueDate)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// ORDER VIEW
// ============================================================
function OrderView({ customers, products, cart, orderCustomerId, orderDiscount, orderNote, orderSuccess,
                    onSetCustomer, onAddToCart, onUpdateQty, onSetDiscount, onSetNote, onSubmit, onClearSuccess, onAddCustomer }) {
  const [productSearch, setProductSearch] = useState('');
  const customer = customers.find(c => c.id === orderCustomerId);
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const total = Math.max(0, subtotal - orderDiscount);

  if (orderSuccess) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, padding: 20 }}>
        <Card style={{ padding: '40px 32px', textAlign: 'center', maxWidth: 380 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: COLORS.jadeSoft,
            color: COLORS.jadeDeep, display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <Check size={32} strokeWidth={2.5} />
          </div>
          <div style={{
            fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
            fontSize: 26, color: COLORS.ink, marginBottom: 6
          }}>
            Tạo đơn thành công
          </div>
          <div style={{ fontSize: 14, color: COLORS.inkSoft, marginBottom: 4 }}>
            {orderSuccess.customer}
          </div>
          <div style={{
            fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
            fontSize: 28, color: COLORS.jadeDeep, marginBottom: 24
          }}>
            {fmtVND(orderSuccess.total)}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <Btn variant="primary" onClick={onClearSuccess}>Tạo đơn khác</Btn>
          </div>
        </Card>
      </div>
    );
  }

  const filteredProducts = productSearch.trim()
    ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()))
    : products;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', fontSize: 32, fontWeight: 400, margin: 0, color: COLORS.ink }}>
          Tạo đơn mới
        </h1>
        <div style={{ fontSize: 13, color: COLORS.inkSoft, marginTop: 4 }}>
          Chọn khách → thêm sản phẩm → xác nhận
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 360px)', gap: 16 }}>
        {/* LEFT: Customer + Products */}
        <div>
          {/* Customer Selector */}
          <Card style={{ padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500, marginBottom: 8 }}>
              Bước 1 · Khách hàng
            </div>
            {customer ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={customer.name} tag={customer.tag} size={44} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{customer.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.inkSoft, fontFamily: 'JetBrains Mono, monospace' }}>{customer.phone}</div>
                </div>
                <button
                  onClick={() => onSetCustomer(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: COLORS.inkSoft, fontSize: 12, fontFamily: 'inherit' }}
                >
                  Đổi
                </button>
              </div>
            ) : (
              <div>
                <select
                  value={orderCustomerId || ''}
                  onChange={e => onSetCustomer(e.target.value || null)}
                  style={{
                    width: '100%', padding: '10px 12px', fontSize: 14,
                    background: COLORS.surfaceAlt, border: `0.5px solid ${COLORS.border}`,
                    borderRadius: 8, color: COLORS.ink, fontFamily: 'inherit', cursor: 'pointer'
                  }}
                >
                  <option value="">— Chọn khách hàng —</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.phone}
                    </option>
                  ))}
                </select>
                <button
                  onClick={onAddCustomer}
                  style={{
                    marginTop: 10, fontSize: 12, color: COLORS.jade, background: 'transparent',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4
                  }}
                >
                  <Plus size={12} /> Thêm khách hàng mới
                </button>
              </div>
            )}
          </Card>

          {/* Products */}
          <Card style={{ padding: 18 }}>
            <div style={{ fontSize: 12, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500, marginBottom: 12 }}>
              Bước 2 · Sản phẩm
            </div>
            <div style={{ marginBottom: 12 }}>
              <Input
                icon={Search}
                placeholder="Tìm sản phẩm theo tên hoặc mã..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {filteredProducts.map(p => {
                const inCart = cart.find(i => i.productId === p.id);
                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', borderRadius: 8,
                      border: `0.5px solid ${inCart ? COLORS.jade : COLORS.border}`,
                      background: inCart ? COLORS.jadeSoft : 'transparent'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: COLORS.inkSoft, fontFamily: 'JetBrains Mono, monospace' }}>
                        {p.sku} · {fmtVND(p.price)}
                      </div>
                    </div>
                    {inCart ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={() => onUpdateQty(p.id, -1)}
                          style={{ width: 26, height: 26, borderRadius: 6, border: `0.5px solid ${COLORS.border}`, background: COLORS.surface, cursor: 'pointer', fontFamily: 'inherit' }}
                        >−</button>
                        <span style={{ fontSize: 13, fontWeight: 500, minWidth: 18, textAlign: 'center' }}>{inCart.qty}</span>
                        <button
                          onClick={() => onUpdateQty(p.id, 1)}
                          style={{ width: 26, height: 26, borderRadius: 6, border: `0.5px solid ${COLORS.border}`, background: COLORS.surface, cursor: 'pointer', fontFamily: 'inherit' }}
                        >+</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onAddToCart(p)}
                        style={{
                          fontSize: 12, padding: '5px 12px', borderRadius: 6,
                          border: `0.5px solid ${COLORS.borderStrong}`, background: 'transparent',
                          cursor: 'pointer', fontFamily: 'inherit', color: COLORS.ink
                        }}
                      >
                        + Thêm
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* RIGHT: Order Summary */}
        <div>
          <Card style={{ padding: 18, position: 'sticky', top: 20 }}>
            <div style={{ fontSize: 12, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500, marginBottom: 12 }}>
              Tóm tắt đơn
            </div>

            {cart.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: COLORS.inkFaint, fontSize: 13 }}>
                Chưa có sản phẩm nào
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                {cart.map(i => (
                  <div key={i.productId} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderBottom: `0.5px solid ${COLORS.border}`
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{i.name}</div>
                      <div style={{ fontSize: 11, color: COLORS.inkSoft, fontFamily: 'JetBrains Mono, monospace' }}>
                        {fmtVND(i.price)} × {i.qty}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{fmtVND(i.price * i.qty)}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
                Giảm giá (₫)
              </label>
              <input
                type="number"
                value={orderDiscount}
                onChange={e => onSetDiscount(parseInt(e.target.value) || 0)}
                placeholder="0"
                style={{
                  width: '100%', padding: '8px 10px', fontSize: 13, marginTop: 4,
                  background: COLORS.surfaceAlt, border: `0.5px solid ${COLORS.border}`,
                  borderRadius: 6, fontFamily: 'inherit', color: COLORS.ink
                }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
                Ghi chú
              </label>
              <textarea
                value={orderNote}
                onChange={e => onSetNote(e.target.value)}
                placeholder="VD: giao trước 17h, gói quà..."
                style={{
                  width: '100%', padding: '8px 10px', fontSize: 13, marginTop: 4,
                  background: COLORS.surfaceAlt, border: `0.5px solid ${COLORS.border}`,
                  borderRadius: 6, fontFamily: 'inherit', minHeight: 60, resize: 'vertical', color: COLORS.ink
                }}
              />
            </div>

            <div style={{ borderTop: `0.5px solid ${COLORS.border}`, paddingTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: COLORS.inkSoft, marginBottom: 4 }}>
                <span>Tạm tính</span>
                <span>{fmtVND(subtotal)}</span>
              </div>
              {orderDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: COLORS.persimmon, marginBottom: 4 }}>
                  <span>Giảm giá</span>
                  <span>−{fmtVND(orderDiscount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
                <span style={{ fontSize: 13, color: COLORS.inkSoft }}>Tổng cộng</span>
                <span style={{
                  fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
                  fontSize: 28, color: COLORS.jadeDeep, lineHeight: 1
                }}>
                  {fmtVND(total)}
                </span>
              </div>
            </div>

            <button
              onClick={onSubmit}
              disabled={!orderCustomerId || !cart.length}
              style={{
                width: '100%', marginTop: 16, padding: '12px',
                background: (!orderCustomerId || !cart.length) ? COLORS.bgAlt : COLORS.jade,
                color: (!orderCustomerId || !cart.length) ? COLORS.inkFaint : '#fff',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500,
                cursor: (!orderCustomerId || !cart.length) ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => { if (orderCustomerId && cart.length) e.target.style.background = COLORS.jadeDeep; }}
              onMouseLeave={e => { if (orderCustomerId && cart.length) e.target.style.background = COLORS.jade; }}
            >
              <Check size={16} /> Xác nhận tạo đơn
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// REMINDERS VIEW
// ============================================================
function RemindersView({ reminders, customers, onToggle, onDelete, onAdd, onOpenCustomer }) {
  const [filter, setFilter] = useState('pending');
  const now = new Date();

  const filtered = reminders.filter(r => {
    if (filter === 'pending') return !r.completed;
    if (filter === 'done') return r.completed;
    return true;
  });

  const overdue = filtered.filter(r => !r.completed && new Date(r.dueDate) < now && !isSameDay(r.dueDate, now));
  const today   = filtered.filter(r => isSameDay(r.dueDate, now));
  const week    = filtered.filter(r => !isSameDay(r.dueDate, now) && new Date(r.dueDate) > now && isThisWeek(r.dueDate));
  const later   = filtered.filter(r => new Date(r.dueDate) > now && !isThisWeek(r.dueDate));
  const done    = filtered.filter(r => r.completed && !overdue.includes(r) && !today.includes(r) && !week.includes(r) && !later.includes(r));

  const Section = ({ title, items, accent }) => {
    if (!items.length) return null;
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 11, color: accent || COLORS.inkSoft,
          textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500,
          marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8
        }}>
          {title}
          <span style={{
            background: (accent || COLORS.inkSoft) + '20',
            padding: '1px 8px', borderRadius: 999, fontSize: 10
          }}>{items.length}</span>
        </div>
        <Card style={{ padding: 0 }}>
          {items.map((r, i) => {
            const c = customers.find(x => x.id === r.customerId);
            return (
              <div
                key={r.id}
                style={{
                  padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start',
                  borderBottom: i < items.length - 1 ? `0.5px solid ${COLORS.border}` : 'none',
                  opacity: r.completed ? 0.55 : 1
                }}
              >
                <button
                  onClick={() => onToggle(r.id)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2, color: r.completed ? COLORS.jade : COLORS.inkFaint }}
                >
                  {r.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, color: COLORS.ink, lineHeight: 1.4,
                    textDecoration: r.completed ? 'line-through' : 'none'
                  }}>
                    {r.task}
                    {r.urgent && !r.completed && (
                      <span style={{
                        marginLeft: 8, fontSize: 10, padding: '1px 6px', borderRadius: 4,
                        background: COLORS.persimmonSoft, color: COLORS.persimmon, fontWeight: 500
                      }}>GẤP</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.inkSoft, marginTop: 3, display: 'flex', gap: 10, alignItems: 'center' }}>
                    {c && (
                      <button
                        onClick={() => onOpenCustomer(c.id)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: COLORS.jade, fontSize: 11, fontFamily: 'inherit' }}
                      >
                        {c.name}
                      </button>
                    )}
                    <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {formatDateVN(r.dueDate)} · {formatTime(r.dueDate)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onDelete(r.id)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: COLORS.inkFaint }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </Card>
      </div>
    );
  };

  const completedCount = reminders.filter(r => r.completed).length;
  const total = reminders.length;
  const completionRate = total ? Math.round(completedCount / total * 100) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', fontSize: 32, fontWeight: 400, margin: 0, color: COLORS.ink }}>
            Nhắc nhở
          </h1>
          <div style={{ fontSize: 13, color: COLORS.inkSoft, marginTop: 4 }}>
            {reminders.filter(r => !r.completed).length} chưa hoàn thành · Hoàn thành {completionRate}%
          </div>
        </div>
        <Btn variant="primary" onClick={onAdd}><Plus size={15} /> Tạo nhắc nhở</Btn>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[['pending','Chưa xong'],['done','Đã xong'],['all','Tất cả']].map(([k,l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            style={{
              fontSize: 12, padding: '6px 14px', borderRadius: 999,
              border: `0.5px solid ${filter === k ? COLORS.ink : COLORS.border}`,
              background: filter === k ? COLORS.ink : 'transparent',
              color: filter === k ? COLORS.bg : COLORS.inkSoft,
              cursor: 'pointer', fontFamily: 'inherit'
            }}
          >{l}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Bell}
            title="Không có nhắc nhở nào"
            subtitle="Tạo nhắc nhở để không bỏ lỡ việc chăm sóc khách hàng."
            action={<Btn variant="primary" size="sm" onClick={onAdd}><Plus size={14} /> Tạo nhắc nhở</Btn>}
          />
        </Card>
      ) : (
        <>
          <Section title="Quá hạn" items={overdue} accent={COLORS.persimmon} />
          <Section title="Hôm nay" items={today} accent={COLORS.jade} />
          <Section title="Trong tuần" items={week} accent={COLORS.ocean} />
          <Section title="Sau này" items={later} />
          <Section title="Đã hoàn thành" items={done} />
        </>
      )}
    </div>
  );
}

// ============================================================
// REPORTS VIEW
// ============================================================
function ReportsView({ orders, customers, products, onExport, onImportProducts }) {
  const [period, setPeriod] = useState('week');

  const now = new Date();
  const periodStart = new Date(now);
  if (period === 'week')    periodStart.setDate(now.getDate() - 7);
  if (period === 'month')   periodStart.setDate(now.getDate() - 30);
  if (period === 'quarter') periodStart.setDate(now.getDate() - 90);

  // Previous period for comparison
  const prevStart = new Date(periodStart);
  const periodLength = (now - periodStart);
  prevStart.setTime(prevStart.getTime() - periodLength);

  const periodOrders = orders.filter(o => new Date(o.date) >= periodStart);
  const prevOrders = orders.filter(o => {
    const d = new Date(o.date);
    return d >= prevStart && d < periodStart;
  });

  const totalRevenue = periodOrders.reduce((s, o) => s + o.total, 0);
  const prevRevenue = prevOrders.reduce((s, o) => s + o.total, 0);
  const revenueChange = prevRevenue > 0 ? Math.round((totalRevenue - prevRevenue) / prevRevenue * 100) : null;
  const orderChange = prevOrders.length > 0 ? Math.round((periodOrders.length - prevOrders.length) / prevOrders.length * 100) : null;

  const avgOrder = periodOrders.length ? Math.round(totalRevenue / periodOrders.length) : 0;
  const newCustomers = customers.filter(c => new Date(c.createdAt) >= periodStart).length;

  // 1. Daily revenue area chart (full period)
  const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
  const showDays = Math.min(days, 30);
  const chartData = Array.from({ length: showDays }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (showDays - 1 - i));
    const dayStr = date.toISOString().slice(0, 10);
    const dayOrders = orders.filter(o => o.date === dayStr);
    return {
      date: `${date.getDate()}/${date.getMonth() + 1}`,
      revenue: Math.round(dayOrders.reduce((s, o) => s + o.total, 0) / 1000),
      orders: dayOrders.length
    };
  });

  // 2. Top customers (bar)
  const topCustomers = [...customers]
    .map(c => ({
      ...c,
      periodSpent: periodOrders.filter(o => o.customerId === c.id).reduce((s, o) => s + o.total, 0),
      ordersInPeriod: periodOrders.filter(o => o.customerId === c.id).length
    }))
    .filter(c => c.periodSpent > 0)
    .sort((a, b) => b.periodSpent - a.periodSpent)
    .slice(0, 5);

  // 3. Top products (bar)
  const productSales = {};
  periodOrders.forEach(o => o.items.forEach(it => {
    if (!productSales[it.productId]) productSales[it.productId] = { qty: 0, revenue: 0 };
    productSales[it.productId].qty += it.qty;
    productSales[it.productId].revenue += it.qty * it.price;
  }));
  const topProducts = Object.entries(productSales)
    .map(([id, s]) => ({ ...products.find(p => p.id === id), ...s }))
    .filter(p => p.name)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // 4. Tag distribution (donut)
  const tagDist = Object.keys(TAGS).map(t => ({
    tag: t,
    name: TAGS[t].label,
    value: customers.filter(c => c.tag === t).length,
    color: TAGS[t].dot
  })).filter(t => t.value > 0);

  // 5. Period comparison (column)
  const comparisonData = (() => {
    if (period === 'week') {
      // Compare day by day across this week vs last week
      return Array.from({ length: 7 }, (_, i) => {
        const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][i];
        const thisDate = new Date(periodStart);
        thisDate.setDate(thisDate.getDate() + i);
        const prevDate = new Date(prevStart);
        prevDate.setDate(prevDate.getDate() + i);
        const thisStr = thisDate.toISOString().slice(0, 10);
        const prevStr = prevDate.toISOString().slice(0, 10);
        return {
          name: dayName,
          'Kỳ này':  Math.round(orders.filter(o => o.date === thisStr).reduce((s, o) => s + o.total, 0) / 1000),
          'Kỳ trước': Math.round(orders.filter(o => o.date === prevStr).reduce((s, o) => s + o.total, 0) / 1000)
        };
      });
    } else {
      // Weekly comparison for month/quarter
      const numWeeks = period === 'month' ? 4 : 12;
      return Array.from({ length: numWeeks }, (_, i) => {
        const thisWkStart = new Date(periodStart);
        thisWkStart.setDate(thisWkStart.getDate() + i * 7);
        const thisWkEnd = new Date(thisWkStart);
        thisWkEnd.setDate(thisWkEnd.getDate() + 7);
        const prevWkStart = new Date(prevStart);
        prevWkStart.setDate(prevWkStart.getDate() + i * 7);
        const prevWkEnd = new Date(prevWkStart);
        prevWkEnd.setDate(prevWkEnd.getDate() + 7);
        return {
          name: `T${i + 1}`,
          'Kỳ này':  Math.round(orders.filter(o => { const d = new Date(o.date); return d >= thisWkStart && d < thisWkEnd; }).reduce((s, o) => s + o.total, 0) / 1000),
          'Kỳ trước': Math.round(orders.filter(o => { const d = new Date(o.date); return d >= prevWkStart && d < prevWkEnd; }).reduce((s, o) => s + o.total, 0) / 1000)
        };
      });
    }
  })();

  // 6. Heatmap data (day of week × hour)
  // Since orders only have dates, we'll use day of week × week
  const heatmapData = (() => {
    const grid = Array(7).fill(null).map(() => Array(Math.max(1, Math.ceil(days / 7))).fill(0));
    periodOrders.forEach(o => {
      const d = new Date(o.date);
      const dow = d.getDay();
      const weekFromStart = Math.floor((d - periodStart) / (7 * 86400000));
      if (grid[dow] && grid[dow][weekFromStart] != null) {
        grid[dow][weekFromStart] += o.total;
      }
    });
    return grid;
  })();

  const heatmapMax = Math.max(...heatmapData.flat(), 1);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', fontSize: 32, fontWeight: 400, margin: 0, color: COLORS.ink }}>
            Báo cáo doanh số
          </h1>
          <div style={{ fontSize: 13, color: COLORS.inkSoft, marginTop: 4 }}>
            Theo dõi hiệu suất bán hàng và sức khoẻ kinh doanh
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, padding: 4, background: COLORS.bgAlt, borderRadius: 999 }}>
            {[['week','Tuần'],['month','Tháng'],['quarter','Quý']].map(([k,l]) => (
              <button
                key={k}
                onClick={() => setPeriod(k)}
                style={{
                  padding: '6px 16px', fontSize: 12, borderRadius: 999, border: 'none',
                  background: period === k ? COLORS.surface : 'transparent',
                  color: period === k ? COLORS.ink : COLORS.inkSoft,
                  cursor: 'pointer', fontFamily: 'inherit', fontWeight: period === k ? 500 : 400
                }}
              >{l}</button>
            ))}
          </div>
          <Btn variant="ghost" onClick={onImportProducts}>
            <Upload size={14} /> Import SP
          </Btn>
          <Btn variant="primary" onClick={onExport}>
            <Download size={14} /> Xuất báo cáo
          </Btn>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard
          label="Doanh số"
          value={fmtVNDShort(totalRevenue) + ' ₫'}
          accent={COLORS.jadeDeep}
          delta={revenueChange != null ? `${revenueChange > 0 ? '+' : ''}${revenueChange}%` : null}
        />
        <StatCard
          label="Số đơn"
          value={periodOrders.length}
          delta={orderChange != null ? `${orderChange > 0 ? '+' : ''}${orderChange}%` : null}
        />
        <StatCard label="Đơn trung bình" value={fmtVNDShort(avgOrder) + ' ₫'} />
        <StatCard label="Khách mới"      value={newCustomers} />
      </div>

      {/* CHART 1: Doanh thu theo thời gian (Area) */}
      <Card style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>📈 Doanh thu theo ngày</div>
          <div style={{ fontSize: 11, color: COLORS.inkFaint, marginTop: 2 }}>Đơn vị: nghìn ₫ · {showDays} ngày gần nhất</div>
        </div>
        <div style={{ height: 240, marginLeft: -10 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={COLORS.jade} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={COLORS.jade} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: COLORS.inkSoft }} axisLine={{ stroke: COLORS.border }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: COLORS.inkSoft }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: COLORS.ink, border: 'none', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: COLORS.bg }}
                itemStyle={{ color: COLORS.bg }}
                formatter={(v, name) => name === 'revenue' ? [`${v}k ₫`, 'Doanh thu'] : [v, 'Đơn']}
              />
              <Area type="monotone" dataKey="revenue" stroke={COLORS.jade} strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* CHART 2 + 3: Top khách + Top sản phẩm (Bar) */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>🏆 Top khách hàng</div>
            <div style={{ fontSize: 11, color: COLORS.inkFaint, marginTop: 2 }}>Theo doanh thu kỳ này</div>
          </div>
          {topCustomers.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: COLORS.inkFaint, fontSize: 13 }}>
              Chưa có dữ liệu
            </div>
          ) : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCustomers.map(c => ({ name: c.name.split(' ').slice(-2).join(' '), value: Math.round(c.periodSpent / 1000), full: c.name }))} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10, fill: COLORS.inkSoft }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: COLORS.ink }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip
                    contentStyle={{ background: COLORS.ink, border: 'none', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: COLORS.bg }}
                    itemStyle={{ color: COLORS.bg }}
                    formatter={v => [`${v}k ₫`, 'Doanh thu']}
                  />
                  <Bar dataKey="value" fill={COLORS.jade} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card style={{ padding: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>🛍 Sản phẩm bán chạy</div>
            <div style={{ fontSize: 11, color: COLORS.inkFaint, marginTop: 2 }}>Top 5 theo doanh thu</div>
          </div>
          {topProducts.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: COLORS.inkFaint, fontSize: 13 }}>
              Chưa có dữ liệu
            </div>
          ) : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts.map(p => ({ name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name, value: Math.round(p.revenue / 1000), qty: p.qty }))} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10, fill: COLORS.inkSoft }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: COLORS.ink }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip
                    contentStyle={{ background: COLORS.ink, border: 'none', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: COLORS.bg }}
                    itemStyle={{ color: COLORS.bg }}
                    formatter={(v, name, p) => [`${v}k ₫ · ${p.payload.qty} đơn vị`, 'Doanh thu']}
                  />
                  <Bar dataKey="value" fill={COLORS.amber} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* CHART 4 + 5: Donut + Column */}
      <div className="grid" style={{ gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.5fr)', gap: 16, marginBottom: 16 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>🍩 Phân bố khách</div>
            <div style={{ fontSize: 11, color: COLORS.inkFaint, marginTop: 2 }}>Theo loại khách hàng</div>
          </div>
          {tagDist.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: COLORS.inkFaint, fontSize: 13 }}>
              Chưa có khách hàng
            </div>
          ) : (
            <>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tagDist}
                      cx="50%" cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {tagDist.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: COLORS.ink, border: 'none', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: COLORS.bg }}
                      itemStyle={{ color: COLORS.bg }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                {tagDist.map(t => (
                  <div key={t.tag} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: t.color }} />
                    <div style={{ fontSize: 11, color: COLORS.ink }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: COLORS.inkFaint, fontFamily: 'JetBrains Mono, monospace' }}>{t.value}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card style={{ padding: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>📊 So sánh kỳ này vs kỳ trước</div>
            <div style={{ fontSize: 11, color: COLORS.inkFaint, marginTop: 2 }}>Doanh thu (nghìn ₫)</div>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: COLORS.inkSoft }} axisLine={{ stroke: COLORS.border }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: COLORS.inkSoft }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: COLORS.ink, border: 'none', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: COLORS.bg }}
                  itemStyle={{ color: COLORS.bg }}
                  formatter={v => `${v}k ₫`}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="Kỳ trước" fill={COLORS.inkFaint} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Kỳ này"  fill={COLORS.jade}    radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* CHART 6: Heatmap doanh thu theo ngày */}
      <Card style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>🔥 Heatmap doanh thu</div>
          <div style={{ fontSize: 11, color: COLORS.inkFaint, marginTop: 2 }}>
            Theo ngày trong tuần × tuần thứ {period === 'week' ? '(1 tuần)' : period === 'month' ? '(4 tuần)' : '(12 tuần)'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', overflow: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 22 }}>
            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
              <div key={d} style={{
                fontSize: 10, color: COLORS.inkSoft, height: 24, display: 'flex',
                alignItems: 'center', minWidth: 22, fontFamily: 'JetBrains Mono, monospace'
              }}>{d}</div>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 4, paddingLeft: 0 }}>
              {heatmapData[0].map((_, w) => (
                <div key={w} style={{
                  flex: 1, fontSize: 9, color: COLORS.inkFaint, textAlign: 'center',
                  fontFamily: 'JetBrains Mono, monospace', minWidth: 24
                }}>
                  T{w + 1}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {heatmapData.map((row, dow) => (
                <div key={dow} style={{ display: 'flex', gap: 4 }}>
                  {row.map((val, w) => {
                    const intensity = val / heatmapMax;
                    const bg = intensity === 0
                      ? COLORS.bgAlt
                      : `rgba(31, 107, 79, ${0.15 + intensity * 0.85})`;
                    return (
                      <div
                        key={w}
                        title={`${['CN','T2','T3','T4','T5','T6','T7'][dow]} tuần ${w + 1}: ${fmtVND(val)}`}
                        style={{
                          flex: 1, height: 24, background: bg, borderRadius: 4,
                          minWidth: 24, cursor: 'pointer',
                          transition: 'transform 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 11, color: COLORS.inkSoft }}>
          <span>Ít</span>
          {[0.15, 0.35, 0.55, 0.75, 1].map((o, i) => (
            <div key={i} style={{ width: 16, height: 16, background: `rgba(31, 107, 79, ${o})`, borderRadius: 3 }} />
          ))}
          <span>Nhiều</span>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// CUSTOMER FORM MODAL
// ============================================================
function CustomerFormModal({ customer, onSave, onClose }) {
  const [form, setForm] = useState(() => customer || {
    name: '', phone: '', email: '', address: '', tag: 'new', notes: ''
  });

  const handleSubmit = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      alert('Vui lòng điền tên và số điện thoại');
      return;
    }
    onSave(form);
  };

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal open onClose={onClose} title={customer ? 'Sửa khách hàng' : 'Thêm khách hàng'}>
      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
            Tên khách hàng *
          </label>
          <Input
            value={form.name}
            onChange={e => update('name', e.target.value)}
            placeholder="Ví dụ: Nguyễn Văn A"
            style={{ marginTop: 4 }}
          />
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
              Số điện thoại *
            </label>
            <Input
              value={form.phone}
              onChange={e => update('phone', e.target.value)}
              placeholder="0901 234 567"
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
              Email
            </label>
            <Input
              value={form.email}
              onChange={e => update('email', e.target.value)}
              placeholder="email@example.com"
              style={{ marginTop: 4 }}
            />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
            Địa chỉ
          </label>
          <Input
            value={form.address}
            onChange={e => update('address', e.target.value)}
            placeholder="Quận, thành phố"
            style={{ marginTop: 4 }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
            Phân loại
          </label>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {Object.entries(TAGS).map(([k, t]) => (
              <button
                key={k}
                onClick={() => update('tag', k)}
                style={{
                  padding: '5px 12px', borderRadius: 999, fontSize: 12,
                  border: `1px solid ${form.tag === k ? t.dot : COLORS.border}`,
                  background: form.tag === k ? t.bg : 'transparent',
                  color: form.tag === k ? t.fg : COLORS.inkSoft,
                  cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
            Ghi chú
          </label>
          <textarea
            value={form.notes}
            onChange={e => update('notes', e.target.value)}
            placeholder="Sở thích, sinh nhật, lưu ý đặc biệt..."
            style={{
              width: '100%', padding: '10px 12px', fontSize: 14, marginTop: 4,
              background: COLORS.surfaceAlt, border: `0.5px solid ${COLORS.border}`,
              borderRadius: 8, fontFamily: 'inherit', minHeight: 70, resize: 'vertical', color: COLORS.ink
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
          <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" onClick={handleSubmit}>
            <Check size={14} /> {customer ? 'Lưu thay đổi' : 'Thêm khách'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// REMINDER FORM MODAL
// ============================================================
function ReminderFormModal({ customers, defaultCustomerId, onSave, onClose }) {
  const tomorrow = new Date(Date.now() + 86400000);
  const defaultDate = `${tomorrow.toISOString().slice(0, 10)}T09:00`;
  const [form, setForm] = useState({
    customerId: defaultCustomerId || '',
    task: '',
    dueDate: defaultDate,
    urgent: false
  });

  const handleSubmit = () => {
    if (!form.customerId || !form.task.trim()) {
      alert('Vui lòng chọn khách và nhập việc cần làm');
      return;
    }
    onSave(form);
  };

  return (
    <Modal open onClose={onClose} title="Tạo nhắc nhở">
      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
            Khách hàng *
          </label>
          <select
            value={form.customerId}
            onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}
            style={{
              width: '100%', padding: '10px 12px', fontSize: 14, marginTop: 4,
              background: COLORS.surfaceAlt, border: `0.5px solid ${COLORS.border}`,
              borderRadius: 8, fontFamily: 'inherit', cursor: 'pointer', color: COLORS.ink
            }}
          >
            <option value="">— Chọn khách —</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
            Việc cần làm *
          </label>
          <Input
            value={form.task}
            onChange={e => setForm(f => ({ ...f, task: e.target.value }))}
            placeholder="VD: Gọi xác nhận đơn, Gửi báo giá..."
            style={{ marginTop: 4 }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
            Thời gian
          </label>
          <input
            type="datetime-local"
            value={form.dueDate}
            onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
            style={{
              width: '100%', padding: '10px 12px', fontSize: 14, marginTop: 4,
              background: COLORS.surfaceAlt, border: `0.5px solid ${COLORS.border}`,
              borderRadius: 8, fontFamily: 'inherit', color: COLORS.ink
            }}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: COLORS.ink }}>
          <input
            type="checkbox"
            checked={form.urgent}
            onChange={e => setForm(f => ({ ...f, urgent: e.target.checked }))}
            style={{ accentColor: COLORS.persimmon }}
          />
          Đánh dấu là gấp
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
          <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" onClick={handleSubmit}><Check size={14} /> Tạo nhắc nhở</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// SEND MESSAGE MODAL — Zalo / SMS quick send with templates
// ============================================================
function SendMessageModal({ customer, defaultChannel, ctx = {}, templates, onSend, onClose }) {
  const [channel, setChannel] = useState(defaultChannel || 'zalo');
  const [templateId, setTemplateId] = useState(null);
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('all');

  const applyTemplate = (t) => {
    setTemplateId(t.id);
    setMessage(fillTemplate(t.body, customer, ctx));
  };

  const filteredTemplates = category === 'all'
    ? templates
    : templates.filter(t => t.category === category);

  const unfilledVars = findUnfilledVars(message);
  const charCount = message.length;
  const smsLimit = /[ăâêôơưđ]/i.test(message) ? 70 : 160; // unicode SMS = 70 chars
  const smsCount = charCount === 0 ? 0 : Math.ceil(charCount / smsLimit);

  const channelInfo = {
    zalo: { label: 'Zalo', icon: MessageSquare, color: COLORS.ocean, bg: COLORS.oceanSoft, hint: 'Mở Zalo với tin đã copy. Bạn paste & gửi.' },
    sms:  { label: 'SMS',  icon: Smartphone,    color: COLORS.amber, bg: COLORS.amberSoft, hint: smsCount > 1 ? `Tin sẽ tách thành ${smsCount} SMS (${smsLimit} ký tự/tin)` : 'Mở app SMS với tin đã soạn sẵn.' }
  };
  const ChIcon = channelInfo[channel].icon;

  const canSend = message.trim().length > 0 && unfilledVars.length === 0;

  return (
    <Modal open onClose={onClose} title={`Gửi tin cho ${customer.name}`} maxWidth={560}>
      <div style={{ display: 'grid', gap: 16 }}>
        {/* Channel selector */}
        <div style={{ display: 'flex', gap: 6, padding: 4, background: COLORS.bgAlt, borderRadius: 999 }}>
          {[
            { id: 'zalo', label: 'Zalo' },
            { id: 'sms',  label: 'SMS'  }
          ].map(c => {
            const Icon = channelInfo[c.id].icon;
            const active = channel === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setChannel(c.id)}
                style={{
                  flex: 1, padding: '8px 12px', fontSize: 13, borderRadius: 999, border: 'none',
                  background: active ? COLORS.surface : 'transparent',
                  color: active ? channelInfo[c.id].color : COLORS.inkSoft,
                  cursor: 'pointer', fontFamily: 'inherit', fontWeight: active ? 500 : 400,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}
              >
                <Icon size={14} /> {c.label}
              </button>
            );
          })}
        </div>

        {/* Customer summary */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 12px', background: COLORS.surfaceAlt, borderRadius: 8
        }}>
          <Avatar name={customer.name} tag={customer.tag} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{customer.name}</div>
            <div style={{ fontSize: 11, color: COLORS.inkSoft, fontFamily: 'JetBrains Mono, monospace' }}>
              {customer.phone}
            </div>
          </div>
          <StatusPill tag={customer.tag} />
        </div>

        {/* Template picker */}
        <div>
          <div style={{
            fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase',
            letterSpacing: '0.05em', fontWeight: 500, marginBottom: 8
          }}>
            Mẫu tin nhắn
          </div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setCategory('all')}
              style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 999,
                border: `0.5px solid ${category === 'all' ? COLORS.ink : COLORS.border}`,
                background: category === 'all' ? COLORS.ink : 'transparent',
                color: category === 'all' ? COLORS.bg : COLORS.inkSoft,
                cursor: 'pointer', fontFamily: 'inherit'
              }}
            >Tất cả</button>
            {Object.entries(TEMPLATE_CATEGORIES).map(([k, c]) => (
              <button
                key={k}
                onClick={() => setCategory(k)}
                style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 999,
                  border: `0.5px solid ${category === k ? c.color : COLORS.border}`,
                  background: category === k ? c.color + '15' : 'transparent',
                  color: category === k ? c.color : COLORS.inkSoft,
                  cursor: 'pointer', fontFamily: 'inherit'
                }}
              >{c.label}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gap: 4, maxHeight: 160, overflowY: 'auto' }} className="scrollable">
            {filteredTemplates.map(t => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t)}
                style={{
                  textAlign: 'left', padding: '8px 12px', borderRadius: 6,
                  border: `0.5px solid ${templateId === t.id ? COLORS.jade : COLORS.border}`,
                  background: templateId === t.id ? COLORS.jadeSoft : 'transparent',
                  cursor: 'pointer', fontFamily: 'inherit'
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 500, color: COLORS.ink, marginBottom: 2 }}>
                  {t.name}
                </div>
                <div style={{ fontSize: 11, color: COLORS.inkSoft, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.body}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Editable message */}
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6
          }}>
            <span style={{
              fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase',
              letterSpacing: '0.05em', fontWeight: 500
            }}>
              Nội dung tin nhắn
            </span>
            <span style={{
              fontSize: 11, color: charCount > smsLimit && channel === 'sms' ? COLORS.persimmon : COLORS.inkFaint,
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              {charCount} ký tự{channel === 'sms' && smsCount > 0 ? ` · ${smsCount} SMS` : ''}
            </span>
          </div>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Chọn mẫu hoặc viết tin nhắn..."
            style={{
              width: '100%', padding: '10px 12px', fontSize: 14,
              background: COLORS.surfaceAlt, border: `0.5px solid ${COLORS.border}`,
              borderRadius: 8, fontFamily: 'inherit', minHeight: 100, resize: 'vertical', color: COLORS.ink,
              lineHeight: 1.5
            }}
          />
          {unfilledVars.length > 0 && (
            <div style={{
              marginTop: 8, padding: '8px 12px', background: COLORS.persimmonSoft,
              borderRadius: 6, fontSize: 12, color: COLORS.persimmon,
              display: 'flex', alignItems: 'flex-start', gap: 8
            }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Còn biến chưa điền: <code style={{ fontFamily: 'JetBrains Mono, monospace' }}>{unfilledVars.join(', ')}</code> — hãy thay bằng nội dung thực hoặc xoá đi.</span>
            </div>
          )}
        </div>

        {/* Hint */}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          padding: '10px 12px', background: channelInfo[channel].bg, borderRadius: 8
        }}>
          <ChIcon size={14} style={{ color: channelInfo[channel].color, marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: channelInfo[channel].color, lineHeight: 1.5 }}>
            {channelInfo[channel].hint}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
          <button
            onClick={() => canSend && onSend(channel, message)}
            disabled={!canSend}
            style={{
              padding: '10px 18px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 500,
              background: canSend ? COLORS.jade : COLORS.bgAlt,
              color: canSend ? '#fff' : COLORS.inkFaint,
              cursor: canSend ? 'pointer' : 'not-allowed',
              display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit'
            }}
          >
            <Send size={14} /> Gửi qua {channelInfo[channel].label}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// SETTINGS MODAL — Templates management + API config
// ============================================================
function SettingsModal({ templates, onSaveTemplates, config, onSaveConfig, onClose }) {
  const [tab, setTab] = useState('templates');
  const [localTemplates, setLocalTemplates] = useState(templates);
  const [localConfig, setLocalConfig] = useState(config);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);

  const saveAndClose = () => {
    onSaveTemplates(localTemplates);
    onSaveConfig(localConfig);
    onClose();
  };

  const deleteTemplate = id => {
    if (!confirm('Xoá mẫu tin này?')) return;
    setLocalTemplates(ts => ts.filter(t => t.id !== id));
  };

  const saveTemplate = data => {
    if (data.id && localTemplates.find(t => t.id === data.id)) {
      setLocalTemplates(ts => ts.map(t => t.id === data.id ? data : t));
    } else {
      setLocalTemplates(ts => [{ ...data, id: data.id || 't_' + genId() }, ...ts]);
    }
    setShowTemplateForm(false);
    setEditingTemplate(null);
  };

  return (
    <Modal open onClose={onClose} title="Cài đặt" maxWidth={640}>
      <div style={{ display: 'flex', borderBottom: `0.5px solid ${COLORS.border}`, marginBottom: 18, marginTop: -8 }}>
        {[
          ['templates', 'Mẫu tin', Megaphone],
          ['shop',      'Cửa hàng', Sparkles],
          ['zalo',      'Zalo API', MessageSquare],
          ['sms',       'SMS API',  Smartphone]
        ].map(([k, label, Icon]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 13, fontFamily: 'inherit',
              color: tab === k ? COLORS.ink : COLORS.inkSoft,
              borderBottom: tab === k ? `2px solid ${COLORS.jade}` : '2px solid transparent',
              fontWeight: tab === k ? 500 : 400, marginBottom: -1,
              display: 'inline-flex', alignItems: 'center', gap: 6
            }}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* TAB: Templates */}
      {tab === 'templates' && (
        <div>
          {showTemplateForm ? (
            <TemplateForm
              template={editingTemplate}
              onSave={saveTemplate}
              onCancel={() => { setShowTemplateForm(false); setEditingTemplate(null); }}
            />
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: COLORS.inkSoft }}>
                  {localTemplates.length} mẫu · Dùng <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, background: COLORS.bgAlt, padding: '1px 5px', borderRadius: 3 }}>{`{{name}}`}</code>, <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, background: COLORS.bgAlt, padding: '1px 5px', borderRadius: 3 }}>{`{{first_name}}`}</code>, <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, background: COLORS.bgAlt, padding: '1px 5px', borderRadius: 3 }}>{`{{shop}}`}</code> để cá nhân hoá
                </div>
                <Btn variant="primary" size="sm" onClick={() => { setEditingTemplate(null); setShowTemplateForm(true); }}>
                  <Plus size={13} /> Thêm mẫu
                </Btn>
              </div>
              <div style={{ display: 'grid', gap: 6, maxHeight: 360, overflowY: 'auto' }} className="scrollable">
                {localTemplates.map(t => {
                  const cat = TEMPLATE_CATEGORIES[t.category] || { label: t.category, color: COLORS.inkSoft };
                  return (
                    <div
                      key={t.id}
                      style={{
                        padding: '10px 12px', borderRadius: 8,
                        border: `0.5px solid ${COLORS.border}`, background: COLORS.surface,
                        display: 'flex', gap: 10, alignItems: 'flex-start'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</span>
                          <span style={{
                            fontSize: 10, padding: '2px 6px', borderRadius: 4,
                            background: cat.color + '15', color: cat.color, fontWeight: 500
                          }}>
                            {cat.label}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: COLORS.inkSoft, lineHeight: 1.4 }}>
                          {t.body}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => { setEditingTemplate(t); setShowTemplateForm(true); }}
                          style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: COLORS.inkSoft }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteTemplate(t.id)}
                          style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: COLORS.rose }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB: Shop info */}
      {tab === 'shop' && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
              Tên của bạn
            </label>
            <Input
              value={localConfig.userName}
              onChange={e => setLocalConfig(c => ({ ...c, userName: e.target.value }))}
              placeholder="VD: Mai, Hùng, Trang..."
              style={{ marginTop: 4 }}
            />
            <div style={{ fontSize: 11, color: COLORS.inkFaint, marginTop: 6 }}>
              Tên này hiển thị trong lời chào trang chủ.
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
              Tên shop / cửa hàng
            </label>
            <Input
              value={localConfig.shopName}
              onChange={e => setLocalConfig(c => ({ ...c, shopName: e.target.value }))}
              placeholder="VD: Shop Hoa Mai, Boutique ABC..."
              style={{ marginTop: 4 }}
            />
            <div style={{ fontSize: 11, color: COLORS.inkFaint, marginTop: 6 }}>
              Tên này sẽ thay biến <code style={{ fontFamily: 'JetBrains Mono, monospace', background: COLORS.bgAlt, padding: '1px 5px', borderRadius: 3 }}>{`{{shop}}`}</code> trong các mẫu tin nhắn.
            </div>
          </div>
        </div>
      )}

      {/* TAB: Zalo API */}
      {tab === 'zalo' && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{
            padding: '12px 14px', background: COLORS.oceanSoft, borderRadius: 8,
            fontSize: 12, color: COLORS.ocean, lineHeight: 1.6
          }}>
            <strong>Zalo ZNS / ZBS Template Message</strong><br />
            Để gửi tin tự động, bạn cần: (1) Zalo OA Doanh nghiệp, (2) ZBS Account, (3) Template đã duyệt, (4) Backend proxy. Giá ~200đ/tin.
            Đăng ký tại <span style={{ textDecoration: 'underline' }}>oa.zalo.me</span>.
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={localConfig.zalo.enabled}
              onChange={e => setLocalConfig(c => ({ ...c, zalo: { ...c.zalo, enabled: e.target.checked } }))}
              style={{ accentColor: COLORS.jade }}
            />
            Bật gửi qua API (cần backend đã setup)
          </label>
          <div>
            <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
              Zalo OA ID
            </label>
            <Input
              value={localConfig.zalo.oaId}
              onChange={e => setLocalConfig(c => ({ ...c, zalo: { ...c.zalo, oaId: e.target.value } }))}
              placeholder="VD: 1234567890"
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
              App ID
            </label>
            <Input
              value={localConfig.zalo.appId}
              onChange={e => setLocalConfig(c => ({ ...c, zalo: { ...c.zalo, appId: e.target.value } }))}
              placeholder="App ID từ developers.zalo.me"
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
              Access Token
            </label>
            <Input
              type="password"
              value={localConfig.zalo.accessToken}
              onChange={e => setLocalConfig(c => ({ ...c, zalo: { ...c.zalo, accessToken: e.target.value } }))}
              placeholder="••••••••"
              style={{ marginTop: 4 }}
            />
          </div>
          <details style={{ fontSize: 12, color: COLORS.inkSoft, cursor: 'pointer' }}>
            <summary style={{ fontWeight: 500, color: COLORS.ink }}>Hướng dẫn setup backend (Vercel Function)</summary>
            <pre style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, marginTop: 10,
              padding: 12, background: COLORS.bgAlt, borderRadius: 6,
              overflow: 'auto', lineHeight: 1.5, whiteSpace: 'pre-wrap'
            }}>{`// /api/send-zns.js (Vercel Function)
export default async function handler(req, res) {
  const { phone, templateId, params } = req.body;
  const r = await fetch('https://business.openapi.zalo.me/message/template', {
    method: 'POST',
    headers: {
      'access_token': process.env.ZALO_ACCESS_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ phone, template_id: templateId, template_data: params })
  });
  const data = await r.json();
  res.json(data);
}`}</pre>
          </details>
        </div>
      )}

      {/* TAB: SMS API */}
      {tab === 'sms' && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{
            padding: '12px 14px', background: COLORS.amberSoft, borderRadius: 8,
            fontSize: 12, color: COLORS.amber, lineHeight: 1.6
          }}>
            <strong>SMS Brandname (SpeedSMS / eSMS)</strong><br />
            Cần đăng ký brandname với nhà mạng (3-5 ngày). Phí duy trì ~50k/tháng/nhà mạng. Giá tin: ~250-500đ tuỳ loại.
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={localConfig.sms.enabled}
              onChange={e => setLocalConfig(c => ({ ...c, sms: { ...c.sms, enabled: e.target.checked } }))}
              style={{ accentColor: COLORS.jade }}
            />
            Bật gửi SMS qua API
          </label>
          <div>
            <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
              Nhà cung cấp
            </label>
            <select
              value={localConfig.sms.provider}
              onChange={e => setLocalConfig(c => ({ ...c, sms: { ...c.sms, provider: e.target.value } }))}
              style={{
                width: '100%', padding: '10px 12px', fontSize: 14, marginTop: 4,
                background: COLORS.surfaceAlt, border: `0.5px solid ${COLORS.border}`,
                borderRadius: 8, fontFamily: 'inherit', cursor: 'pointer', color: COLORS.ink
              }}
            >
              <option value="speedsms">SpeedSMS</option>
              <option value="esms">eSMS (VietGuys)</option>
              <option value="stringee">Stringee</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
              Brandname (tối đa 11 ký tự)
            </label>
            <Input
              value={localConfig.sms.brandname}
              onChange={e => setLocalConfig(c => ({ ...c, sms: { ...c.sms, brandname: e.target.value.toUpperCase().slice(0, 11) } }))}
              placeholder="VD: SHOPLINH"
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
              API Access Token
            </label>
            <Input
              type="password"
              value={localConfig.sms.token}
              onChange={e => setLocalConfig(c => ({ ...c, sms: { ...c.sms, token: e.target.value } }))}
              placeholder="••••••••"
              style={{ marginTop: 4 }}
            />
          </div>
          <details style={{ fontSize: 12, color: COLORS.inkSoft, cursor: 'pointer' }}>
            <summary style={{ fontWeight: 500, color: COLORS.ink }}>Hướng dẫn setup backend (SpeedSMS)</summary>
            <pre style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, marginTop: 10,
              padding: 12, background: COLORS.bgAlt, borderRadius: 6,
              overflow: 'auto', lineHeight: 1.5, whiteSpace: 'pre-wrap'
            }}>{`// /api/send-sms.js (Vercel Function)
export default async function handler(req, res) {
  const { phone, message, sender } = req.body;
  const url = 'https://api.speedsms.vn/index.php/sms/send';
  const auth = Buffer.from(process.env.SPEEDSMS_TOKEN + ':x').toString('base64');
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + auth,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ to: [phone], content: message, type: 3, sender })
  });
  const data = await r.json();
  res.json(data);
}`}</pre>
          </details>
        </div>
      )}

      <div style={{
        display: 'flex', gap: 8, justifyContent: 'flex-end',
        marginTop: 20, paddingTop: 16, borderTop: `0.5px solid ${COLORS.border}`
      }}>
        <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
        <Btn variant="primary" onClick={saveAndClose}><Check size={14} /> Lưu cài đặt</Btn>
      </div>
    </Modal>
  );
}

// ============================================================
// TEMPLATE FORM (sub-form inside SettingsModal)
// ============================================================
function TemplateForm({ template, onSave, onCancel }) {
  const [form, setForm] = useState(() => template || {
    id: '', name: '', category: 'sales', channel: 'both', body: ''
  });

  const handleSubmit = () => {
    if (!form.name.trim() || !form.body.trim()) {
      alert('Vui lòng điền tên mẫu và nội dung');
      return;
    }
    onSave(form);
  };

  const insertVar = v => {
    setForm(f => ({ ...f, body: f.body + ` {{${v}}}` }));
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <button
        onClick={onCancel}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: COLORS.inkSoft, fontSize: 12, padding: 0, fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: 4, alignSelf: 'flex-start'
        }}
      >
        <ChevronLeft size={14} /> Quay lại danh sách
      </button>
      <div>
        <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
          Tên mẫu *
        </label>
        <Input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="VD: Cảm ơn sau đơn hàng"
          style={{ marginTop: 4 }}
        />
      </div>
      <div>
        <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
          Phân loại
        </label>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {Object.entries(TEMPLATE_CATEGORIES).map(([k, c]) => (
            <button
              key={k}
              onClick={() => setForm(f => ({ ...f, category: k }))}
              style={{
                padding: '5px 12px', borderRadius: 999, fontSize: 12,
                border: `1px solid ${form.category === k ? c.color : COLORS.border}`,
                background: form.category === k ? c.color + '15' : 'transparent',
                color: form.category === k ? c.color : COLORS.inkSoft,
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
            Nội dung *
          </label>
          <span style={{ fontSize: 11, color: COLORS.inkFaint, fontFamily: 'JetBrains Mono, monospace' }}>
            {form.body.length} ký tự
          </span>
        </div>
        <textarea
          value={form.body}
          onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
          placeholder="Chào {{name}}, ..."
          style={{
            width: '100%', padding: '10px 12px', fontSize: 14,
            background: COLORS.surfaceAlt, border: `0.5px solid ${COLORS.border}`,
            borderRadius: 8, fontFamily: 'inherit', minHeight: 100, resize: 'vertical', color: COLORS.ink,
            lineHeight: 1.5
          }}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: COLORS.inkSoft, alignSelf: 'center' }}>Chèn biến:</span>
          {['name', 'first_name', 'phone', 'shop', 'order_id', 'order_total', 'discount'].map(v => (
            <button
              key={v}
              onClick={() => insertVar(v)}
              style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 4,
                border: `0.5px solid ${COLORS.border}`, background: COLORS.bgAlt,
                color: COLORS.ink, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace'
              }}
            >
              {`{{${v}}}`}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onCancel}>Huỷ</Btn>
        <Btn variant="primary" onClick={handleSubmit}>
          <Check size={14} /> {template ? 'Lưu thay đổi' : 'Tạo mẫu'}
        </Btn>
      </div>
    </div>
  );
}

// ============================================================
// IMPORT DATA MODAL — Paste from Excel/Sheets/CSV
// ============================================================
function ImportDataModal({ type, existingCount, onImport, onClose }) {
  const [step, setStep] = useState('paste'); // 'paste' | 'preview'
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [mapping, setMapping] = useState({});
  const [replace, setReplace] = useState(false);

  const isCustomers = type === 'customers';
  const titleText = isCustomers ? 'khách hàng' : 'sản phẩm';

  const sampleText = isCustomers
    ? `Tên\tSĐT\tEmail\tĐịa chỉ\tLoại\tGhi chú
Nguyễn Văn An\t0901234567\tan@email.com\tQ1, TP.HCM\tVIP\tKhách thân thiết
Trần Thị Bình\t0912345678\tbinh@email.com\tQ7, TP.HCM\tMới\t`
    : `Tên\tMã\tGiá
Áo thun trắng\tAT-001\t250000
Quần jeans nam\tQJ-002\t450000`;

  const tryParse = () => {
    if (!rawText.trim()) {
      alert('Vui lòng paste dữ liệu');
      return;
    }
    const result = parsePastedData(rawText);
    if (result.rows.length === 0) {
      alert('Không phân tích được dữ liệu. Hãy kiểm tra lại format.');
      return;
    }
    // Auto-map columns
    const autoMap = {};
    result.headers.forEach(h => {
      const field = matchField(h, isCustomers ? 'customer' : 'product');
      if (field) autoMap[h] = field;
    });
    setParsed(result);
    setMapping(autoMap);
    setStep('preview');
  };

  const transformRows = () => {
    if (!parsed) return [];
    return parsed.rows.map(row => {
      const obj = {};
      Object.entries(mapping).forEach(([header, field]) => {
        if (!field) return;
        let val = row[header];
        if (field === 'price' || field === 'totalSpent') val = parsePrice(val);
        if (field === 'tag') val = guessTagFromText(val) || 'new';
        obj[field] = val;
      });
      return obj;
    }).filter(r => isCustomers ? (r.name && r.phone) : r.name);
  };

  const transformedRows = step === 'preview' ? transformRows() : [];
  const requiredFields = isCustomers ? ['name', 'phone'] : ['name'];
  const fieldsAvailable = new Set(Object.values(mapping).filter(Boolean));
  const missingRequired = requiredFields.filter(f => !fieldsAvailable.has(f));

  const customerFields = [
    ['name',    'Tên'],
    ['phone',   'Số điện thoại'],
    ['email',   'Email'],
    ['address', 'Địa chỉ'],
    ['tag',     'Phân loại'],
    ['notes',   'Ghi chú'],
    ['totalSpent', 'Tổng chi tiêu (₫)']
  ];
  const productFields = [
    ['name',  'Tên sản phẩm'],
    ['sku',   'Mã SKU'],
    ['price', 'Giá (₫)']
  ];
  const fields = isCustomers ? customerFields : productFields;

  return (
    <Modal open onClose={onClose} title={`Import ${titleText}`} maxWidth={680}>
      {step === 'paste' && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{
            padding: '12px 14px', background: COLORS.oceanSoft, borderRadius: 8,
            fontSize: 12, color: COLORS.ocean, lineHeight: 1.6
          }}>
            <strong>📋 Cách import:</strong><br />
            1. Mở file Excel hoặc Google Sheets có data {titleText}<br />
            2. Bôi đen toàn bộ dữ liệu (kể cả dòng tiêu đề) → Ctrl+C<br />
            3. Paste vào ô bên dưới → bấm <strong>Phân tích</strong>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
                Dán dữ liệu (TSV / CSV)
              </label>
              <button
                onClick={() => setRawText(sampleText)}
                style={{ fontSize: 11, color: COLORS.jade, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <ClipboardPaste size={11} style={{ display: 'inline', marginRight: 3 }} />
                Dùng mẫu
              </button>
            </div>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={sampleText}
              style={{
                width: '100%', padding: 12, fontSize: 12, lineHeight: 1.5,
                background: COLORS.surfaceAlt, border: `0.5px solid ${COLORS.border}`,
                borderRadius: 8, fontFamily: 'JetBrains Mono, monospace',
                minHeight: 200, resize: 'vertical', color: COLORS.ink
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
            <Btn variant="primary" onClick={tryParse}>
              <Eye size={14} /> Phân tích
            </Btn>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
              Khớp cột (mapping)
            </label>
            <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
              {parsed.headers.map(h => (
                <div key={h} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 10px', background: COLORS.bgAlt, borderRadius: 6
                }}>
                  <code style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                    background: COLORS.surface, padding: '2px 8px', borderRadius: 4,
                    flex: '0 0 auto', maxWidth: '40%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>{h}</code>
                  <span style={{ fontSize: 11, color: COLORS.inkFaint }}>→</span>
                  <select
                    value={mapping[h] || ''}
                    onChange={e => setMapping(m => ({ ...m, [h]: e.target.value || null }))}
                    style={{
                      flex: 1, padding: '4px 8px', fontSize: 12,
                      background: COLORS.surface, border: `0.5px solid ${COLORS.border}`,
                      borderRadius: 4, fontFamily: 'inherit', color: COLORS.ink
                    }}
                  >
                    <option value="">— Bỏ qua —</option>
                    {fields.map(([f, l]) => (
                      <option key={f} value={f}>{l}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {missingRequired.length > 0 && (
            <div style={{
              padding: '10px 12px', background: COLORS.persimmonSoft, borderRadius: 6,
              fontSize: 12, color: COLORS.persimmon, display: 'flex', gap: 8, alignItems: 'flex-start'
            }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              Thiếu cột bắt buộc: {missingRequired.map(f => fields.find(([k]) => k === f)?.[1]).join(', ')}
            </div>
          )}

          <div>
            <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
              Xem trước ({transformedRows.length} dòng hợp lệ)
            </label>
            <div style={{
              marginTop: 6, maxHeight: 200, overflow: 'auto',
              border: `0.5px solid ${COLORS.border}`, borderRadius: 6
            }} className="scrollable">
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: COLORS.surfaceAlt }}>
                  <tr>
                    {fields.filter(([f]) => fieldsAvailable.has(f)).map(([f, l]) => (
                      <th key={f} style={{
                        padding: '6px 10px', textAlign: 'left', fontWeight: 500,
                        borderBottom: `0.5px solid ${COLORS.border}`, color: COLORS.inkSoft
                      }}>{l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transformedRows.slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      {fields.filter(([f]) => fieldsAvailable.has(f)).map(([f]) => (
                        <td key={f} style={{
                          padding: '6px 10px', borderBottom: `0.5px solid ${COLORS.border}`,
                          maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                          {row[f] != null ? String(row[f]) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {transformedRows.length > 10 && (
                <div style={{ padding: 8, fontSize: 11, color: COLORS.inkFaint, textAlign: 'center', background: COLORS.surfaceAlt }}>
                  ... và {transformedRows.length - 10} dòng khác
                </div>
              )}
            </div>
          </div>

          {existingCount > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={replace}
                onChange={e => setReplace(e.target.checked)}
                style={{ accentColor: COLORS.persimmon }}
              />
              Xoá toàn bộ {existingCount} {titleText} hiện có và thay bằng dữ liệu này
              <span style={{ fontSize: 11, color: COLORS.persimmon }}>(không thể hoàn tác)</span>
            </label>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            <Btn variant="ghost" onClick={() => setStep('paste')}>
              <ChevronLeft size={14} /> Quay lại
            </Btn>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
              <Btn
                variant="primary"
                onClick={() => onImport(transformedRows, replace)}
                disabled={transformedRows.length === 0 || missingRequired.length > 0}
              >
                <Check size={14} /> Import {transformedRows.length} dòng
              </Btn>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ============================================================
// EXPORT MODAL — Choose format (Excel / CSV / Google Sheets)
// ============================================================
function ExportModal({ customers, orders, products, onClose, onToast }) {
  const [period, setPeriod] = useState('month');
  const [format, setFormat] = useState('excel');

  const periodStart = useMemo(() => {
    const d = new Date();
    if (period === 'week')    d.setDate(d.getDate() - 7);
    if (period === 'month')   d.setDate(d.getDate() - 30);
    if (period === 'quarter') d.setDate(d.getDate() - 90);
    if (period === 'all')     d.setFullYear(d.getFullYear() - 100);
    return d;
  }, [period]);

  const data = useMemo(
    () => buildReportSheets({ customers, orders, products, period, periodStart }),
    [customers, orders, products, period, periodStart]
  );

  const today = new Date().toISOString().slice(0, 10);

  const doExport = () => {
    if (format === 'excel') {
      exportToExcel(data, `bao-cao-ban-hang-${today}.xlsx`);
      onToast('Đã tải file Excel');
      onClose();
    } else if (format === 'csv') {
      // Single CSV with orders only (most common need)
      const ws = XLSX.utils.json_to_sheet(data.ordersData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `don-hang-${today}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      onToast('Đã tải file CSV');
      onClose();
    } else if (format === 'gsheets') {
      const tsv = copyTSVForGoogleSheets(data);
      navigator.clipboard.writeText(tsv).then(() => {
        window.open('https://docs.google.com/spreadsheets/u/0/create', '_blank');
        onToast('Đã copy! Paste vào Google Sheets vừa mở');
        onClose();
      }).catch(() => {
        alert('Không copy được. Hãy thử lại hoặc dùng Excel.');
      });
    }
  };

  const formats = [
    {
      id: 'excel',
      icon: FileSpreadsheet,
      title: 'Excel (.xlsx)',
      desc: '5 sheet riêng: Tổng quan, Khách hàng, Đơn hàng, Doanh thu, Sản phẩm',
      color: COLORS.jade,
      bg: COLORS.jadeSoft
    },
    {
      id: 'gsheets',
      icon: Database,
      title: 'Google Sheets',
      desc: 'Copy data và mở Google Sheets mới — chỉ cần Ctrl+V để paste',
      color: COLORS.ocean,
      bg: COLORS.oceanSoft
    },
    {
      id: 'csv',
      icon: FileText,
      title: 'CSV (chỉ đơn hàng)',
      desc: 'File text gọn nhẹ, mở được bằng Excel/Sheets/Numbers',
      color: COLORS.amber,
      bg: COLORS.amberSoft
    }
  ];

  return (
    <Modal open onClose={onClose} title="Xuất báo cáo" maxWidth={520}>
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
            Khoảng thời gian
          </label>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {[['week','7 ngày'],['month','30 ngày'],['quarter','90 ngày'],['all','Toàn bộ']].map(([k,l]) => (
              <button
                key={k}
                onClick={() => setPeriod(k)}
                style={{
                  padding: '6px 14px', borderRadius: 999, fontSize: 12,
                  border: `1px solid ${period === k ? COLORS.ink : COLORS.border}`,
                  background: period === k ? COLORS.ink : 'transparent',
                  color: period === k ? COLORS.bg : COLORS.inkSoft,
                  cursor: 'pointer', fontFamily: 'inherit'
                }}
              >{l}</button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: 11, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
            Định dạng
          </label>
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            {formats.map(f => {
              const Icon = f.icon;
              const active = format === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 10,
                    border: `1px solid ${active ? f.color : COLORS.border}`,
                    background: active ? f.bg : COLORS.surface,
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left'
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 8,
                    background: f.color, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Icon size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: COLORS.ink, marginBottom: 2 }}>
                      {f.title}
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.inkSoft, lineHeight: 1.4 }}>
                      {f.desc}
                    </div>
                  </div>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: `1.5px solid ${active ? f.color : COLORS.border}`,
                    background: active ? f.color : 'transparent',
                    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {active && <Check size={11} color="#fff" strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{
          padding: '10px 12px', background: COLORS.surfaceAlt, borderRadius: 8,
          fontSize: 12, color: COLORS.inkSoft, display: 'flex', gap: 14, flexWrap: 'wrap'
        }}>
          <span>📊 {data.ordersData.length} đơn</span>
          <span>👥 {data.customersData.length} khách</span>
          <span>📦 {data.productsData.length} sản phẩm</span>
          <span>📅 {data.dailyData.length} ngày</span>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" onClick={doExport}>
            <Download size={14} /> Xuất ngay
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
