import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  ChevronDown, Building2, Home, TrendingUp, TrendingDown,
  CheckCircle, XCircle, ArrowDown, ArrowRight, AlertTriangle,
  Landmark, Users, DollarSign, Percent, Clock, Shield,
} from "lucide-react";

// ─── Types & Constants ────────────────────────────────────────────────────────

type InvestorChoice = "noxh" | "commercial" | null;
type PolicyKey = "exemptLand" | "reduceTax" | "preferentialLoan" | "interestSupport" | "streamlineProcedure";

const APARTMENT_PRICE = 3500;

const NOXH_STEPS = [
  "Giá bán được khống chế theo quy định của Nhà nước",
  "Biên lợi nhuận thấp hơn thị trường 3–4 lần",
  "Thủ tục phê duyệt kéo dài 2–3 năm",
  "Chi phí vốn tăng do thời gian triển khai dài",
  "Tốc độ thu hồi vốn chậm, rủi ro thanh khoản cao",
  "Hiệu quả đầu tư không đạt kỳ vọng của quỹ",
  "Cổ đông yêu cầu Ban điều hành giải trình",
];

const COMMERCIAL_STEPS = [
  "Giá bán theo thị trường — không bị khống chế",
  "Biên lợi nhuận cao từ 25–35% trên tổng đầu tư",
  "Thu hồi vốn nhanh trong vòng 3–5 năm",
  "Lợi nhuận vượt kỳ vọng, cổ đông hài lòng",
  "Quỹ được đánh giá cao, thu hút thêm nhà đầu tư mới",
  "Danh mục đầu tư được mở rộng mạnh",
];

const POLICIES: { key: PolicyKey; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: "exemptLand", label: "Miễn tiền sử dụng đất", desc: "Giảm chi phí đầu vào cho chủ đầu tư NOXH", icon: <Home className="w-4 h-4" /> },
  { key: "reduceTax", label: "Giảm thuế TNDN", desc: "Ưu đãi thuế thu nhập doanh nghiệp đầu tư NOXH", icon: <Percent className="w-4 h-4" /> },
  { key: "preferentialLoan", label: "Vay ưu đãi cho người mua", desc: "Lãi suất thấp giúp tăng khả năng tiếp cận của người dân", icon: <DollarSign className="w-4 h-4" /> },
  { key: "interestSupport", label: "Hỗ trợ lãi suất vay vốn", desc: "Nhà nước bù lãi suất cho chủ đầu tư xây NOXH", icon: <TrendingDown className="w-4 h-4" /> },
  { key: "streamlineProcedure", label: "Rút ngắn thủ tục hành chính", desc: "Số hóa, đơn giản hóa quy trình phê duyệt dự án", icon: <Clock className="w-4 h-4" /> },
];

const BASE = { profit: 5, access: 28, supply: 15, cashflow: 30 };
const IMPACTS: Record<PolicyKey, typeof BASE> = {
  exemptLand:          { profit: 5, access: 2,  supply: 12, cashflow: 8  },
  reduceTax:           { profit: 4, access: 2,  supply: 8,  cashflow: 6  },
  preferentialLoan:    { profit: 1, access: 20, supply: 10, cashflow: 5  },
  interestSupport:     { profit: 1, access: 15, supply: 5,  cashflow: 4  },
  streamlineProcedure: { profit: 2, access: 2,  supply: 8,  cashflow: 12 },
};

function computeMetrics(policies: Record<PolicyKey, boolean>) {
  const m = { ...BASE };
  for (const k of Object.keys(policies) as PolicyKey[]) {
    if (policies[k]) {
      m.profit   = Math.min(m.profit   + IMPACTS[k].profit,   26);
      m.access   = Math.min(m.access   + IMPACTS[k].access,   82);
      m.supply   = Math.min(m.supply   + IMPACTS[k].supply,   78);
      m.cashflow = Math.min(m.cashflow + IMPACTS[k].cashflow, 80);
    }
  }
  return m;
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] tracking-[0.45em] uppercase text-accent/70 mb-4">
      {children}
    </p>
  );
}

function Headline({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-4xl md:text-6xl font-black leading-[0.9] tracking-tight text-foreground mb-6">
      {children}
    </h2>
  );
}

function Next({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group inline-flex items-center gap-3 border border-accent/30 hover:border-accent hover:bg-accent/10 text-accent font-bold text-xs tracking-[0.2em] uppercase px-8 py-3.5 transition-all duration-300"
    >
      {label}
      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
    </button>
  );
}

function FlowBox({ label, variant = "neutral" }: { label: string; variant?: "accent" | "primary" | "neutral" }) {
  const cls =
    variant === "accent"
      ? "bg-accent/10 border-accent/25 text-foreground"
      : variant === "primary"
      ? "bg-primary/10 border-primary/25 text-foreground"
      : "bg-foreground/5 border-border text-foreground/80";
  return (
    <div className={`border px-4 py-2.5 text-sm text-center font-mono ${cls}`}>
      {label}
    </div>
  );
}

function FloatingTitleLine({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`inline-flex whitespace-nowrap ${className}`} aria-hidden="true">
      {Array.from(text).map((character, index) => (
        <motion.span
          key={`${character}-${index}`}
          className="inline-block will-change-transform"
          animate={{
            y: [0, -10, -3, 5, 0],
            rotate: [0, -1.2, 0.8, -0.5, 0],
          }}
          transition={{
            duration: 3.8,
            delay: index * 0.09,
            repeat: Infinity,
            repeatDelay: 0.15,
            ease: "easeInOut",
          }}
        >
          {character === " " ? "\u00A0" : character}
        </motion.span>
      ))}
    </span>
  );
}

// ─── Section 1 · Hero ─────────────────────────────────────────────────────────

function Section1Hero({ onNext }: { onNext: () => void }) {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const backgroundScale = useTransform(scrollYProgress, [0, 1], [1.08, 1.18]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.72], [1, 0]);

  return (
    <section ref={heroRef} className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[#05091C]">
        <motion.img
          src="/images/tp-hcm-hero.jpg"
          alt="Thành phố Hồ Chí Minh về đêm"
          className="absolute -inset-y-24 inset-x-0 w-full h-[calc(100%+12rem)] object-cover opacity-30 will-change-transform"
          style={{ y: backgroundY, scale: backgroundScale }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#05091C]/40 via-transparent to-[#05091C]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05091C]/60 via-transparent to-[#05091C]/60" />
      </div>

      <motion.div
        className="relative z-10 text-center px-6 max-w-5xl mx-auto"
        style={{ y: contentY, opacity: contentOpacity }}
      >
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-7"
        >
          <p className="font-mono text-[11px] tracking-[0.55em] uppercase text-accent/70">
            Trải nghiệm Kinh tế học Đô thị · Chương 5
          </p>

          <h1
            className="font-display text-[clamp(4.5rem,13vw,10rem)] font-black leading-[0.82] tracking-tight"
            aria-label="Có nhà chưa ní?"
          >
            <FloatingTitleLine text="CÓ NHÀ" />
            <br />
            <FloatingTitleLine text="CHƯA NÍ?" className="text-primary" />
          </h1>

          <div className="flex items-center justify-center gap-5">
            <div className="h-px w-16 bg-foreground/15" />
            <p className="font-display text-sm md:text-base italic text-foreground/45 whitespace-nowrap">
              CHUYỆN NHÀ ĐẤT, CẦN NHÀ NƯỚC
            </p>
            <div className="h-px w-16 bg-foreground/15" />
          </div>

          <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto leading-relaxed">
            Một hành trình trải nghiệm Kinh tế thị trường định hướng XHCN.
            Khi thị trường không thể tự giải quyết bài toán nhà ở, hãy trải nghiệm ba vai trò để tự rút ra kết luận.
          </p>

          <div className="pt-2">
            <button
              onClick={onNext}
              className="group inline-flex items-center gap-3 bg-primary hover:bg-primary/85 text-white font-bold text-xs tracking-[0.25em] uppercase px-10 py-4 transition-all duration-300 shadow-xl shadow-primary/20"
            >
              Bắt đầu hành trình · Géc gô
              <ArrowDown className="w-4 h-4 group-hover:translate-y-1 transition-transform duration-300" />
            </button>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        animate={{ opacity: [0.2, 0.6, 0.2] }}
        transition={{ repeat: Infinity, duration: 2.8 }}
      >
        <span className="font-mono text-[10px] tracking-[0.4em] text-foreground/25 uppercase">Cuộn xuống</span>
        <ChevronDown className="w-4 h-4 text-foreground/25" />
      </motion.div>
    </section>
  );
}

// ─── Section 2 · Student ──────────────────────────────────────────────────────

function Section2Student({
  sectionRef,
  onNext,
}: {
  sectionRef: React.RefObject<HTMLDivElement>;
  onNext: () => void;
}) {
  const [salary, setSalary] = useState(12);
  const [monthlyExpenses, setMonthlyExpenses] = useState(6);
  const [savingRate, setSavingRate] = useState(60);

  const effectiveExpenses = Math.min(monthlyExpenses, Math.max(salary - 1, 0));
  const availableIncome = Math.max(salary - effectiveExpenses, 0);
  const savings = parseFloat((availableIncome * (savingRate / 100)).toFixed(1));
  const yearsNeeded = savings > 0 ? Math.round(APARTMENT_PRICE / (savings * 12)) : 999;

  return (
    <div ref={sectionRef} className="min-h-screen bg-background py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-14">
          <Tag>Vai trò 1 · Người dân · Sinh viên mới ra trường</Tag>
          <Headline>
            Bạn vừa đi làm.<br />
            Bao giờ mua được nhà?
          </Headline>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl leading-relaxed">
            Sau nhiều năm học tập, bạn bắt đầu ấp ủ giấc mơ sở hữu căn nhà đầu tiên tại TP.HCM.
            Kéo các thanh trượt để xem thực tế tài chính của bạn.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div className="space-y-5">
            {/* Salary */}
            <div className="bg-card border border-border p-6">
              <div className="flex justify-between items-baseline mb-5">
                <label className="font-mono text-[11px] tracking-[0.35em] uppercase text-muted-foreground">
                  Thu nhập hàng tháng
                </label>
                <span className="font-display text-3xl font-bold text-accent">{salary}M</span>
              </div>
              <input
                type="range" min={6} max={25} step={1} value={salary}
                aria-label="Thu nhập hàng tháng"
                onChange={e => setSalary(Number(e.target.value))}
                className="w-full h-1.5 appearance-none bg-border rounded-none cursor-pointer accent-accent"
                style={{ accentColor: "var(--accent)" }}
              />
              <div className="flex justify-between font-mono text-[11px] text-muted-foreground mt-2">
                <span>6 triệu</span><span>25 triệu</span>
              </div>
            </div>

            {/* Monthly expenses */}
            <div className="bg-card border border-border p-6">
              <div className="flex justify-between items-baseline mb-5">
                <label className="font-mono text-[11px] tracking-[0.35em] uppercase text-muted-foreground">
                  Chi tiêu hàng tháng
                </label>
                <span className="font-display text-3xl font-bold text-accent">{effectiveExpenses}M</span>
              </div>
              <input
                type="range" min={3} max={Math.max(3, salary - 1)} step={0.5} value={effectiveExpenses}
                aria-label="Chi tiêu hàng tháng"
                onChange={e => setMonthlyExpenses(Number(e.target.value))}
                className="w-full h-1.5 appearance-none bg-border rounded-none cursor-pointer"
                style={{ accentColor: "var(--accent)" }}
              />
              <div className="flex justify-between font-mono text-[11px] text-muted-foreground mt-2">
                <span>3 triệu</span><span>{Math.max(3, salary - 1)} triệu</span>
              </div>
            </div>

            {/* Savings rate */}
            <div className="bg-card border border-border p-6">
              <div className="flex justify-between items-baseline mb-5">
                <label className="font-mono text-[11px] tracking-[0.35em] uppercase text-muted-foreground">
                  Tỷ lệ phần còn lại dành để tiết kiệm
                </label>
                <span className="font-display text-3xl font-bold text-accent">{savingRate}%</span>
              </div>
              <input
                type="range" min={10} max={100} step={5} value={savingRate}
                aria-label="Tỷ lệ phần thu nhập còn lại dành để tiết kiệm"
                onChange={e => setSavingRate(Number(e.target.value))}
                className="w-full h-1.5 appearance-none bg-border rounded-none cursor-pointer"
                style={{ accentColor: "var(--accent)" }}
              />
              <div className="flex justify-between font-mono text-[11px] text-muted-foreground mt-2">
                <span>10%</span><span>100%</span>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-card border border-border p-6 space-y-3.5">
              {[
                { label: "Thu nhập còn lại sau chi tiêu", value: `${availableIncome.toFixed(1)}M đồng` },
                { label: "Tiết kiệm mỗi tháng", value: `${savings}M đồng` },
                { label: "Tiết kiệm mỗi năm", value: `${(savings * 12).toFixed(1)}M đồng` },
                { label: "Giá căn hộ trung bình (TP.HCM)", value: "3.500M (3,5 tỷ)", special: true },
              ].map(row => (
                <div key={row.label} className={`flex justify-between items-center ${row.special ? "pt-3.5 border-t border-border" : ""}`}>
                  <span className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground">{row.label}</span>
                  <span className={`font-mono text-sm font-bold ${row.special ? "text-foreground" : "text-foreground/80"}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Result panel */}
          <div className="flex flex-col items-center text-center space-y-6">
            <p className="font-mono text-[11px] tracking-[0.4em] uppercase text-muted-foreground">
              Với mức tiết kiệm này, bạn cần
            </p>

            <motion.div key={yearsNeeded} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 18 }}>
              <span className="font-display text-[clamp(5.5rem,20vw,11rem)] font-black text-primary leading-none">
                {yearsNeeded > 200 ? "∞" : yearsNeeded}
              </span>
              <span className="font-display text-3xl font-bold text-primary/50"> năm</span>
            </motion.div>

            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
              để tích lũy đủ tiền mua căn hộ
              <br />
              <span className="text-foreground/60 text-xs">(chưa tính lãi vay, lạm phát và giá nhà tiếp tục tăng)</span>
            </p>

            <AnimatePresence>
              {yearsNeeded > 30 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-primary/8 border border-primary/25 p-4 max-w-xs"
                >
                  <p className="text-primary text-sm leading-relaxed">
                    {yearsNeeded > 80
                      ? "Khi bạn đủ tiền mua nhà, có lẽ bạn đã không còn trên đời này nữa."
                      : "Khi bạn đủ tiền mua nhà, bạn đã qua tuổi trung niên từ lâu."}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pt-4 space-y-3">
              <p className="text-muted-foreground text-sm">
                Vì sao người trẻ ngày càng khó có nhà?<br />
                Hãy chuyển sang góc nhìn của người quyết định.
              </p>
              <Next label="Khám phá nguyên nhân" onClick={onNext} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section 3 · Investor ─────────────────────────────────────────────────────

function Section3Investor({
  sectionRef,
  onNext,
}: {
  sectionRef: React.RefObject<HTMLDivElement>;
  onNext: () => void;
}) {
  const [choice, setChoice] = useState<InvestorChoice>(null);
  const [showResult, setShowResult] = useState(false);
  const [showInsight, setShowInsight] = useState(false);

  const steps = choice === "noxh" ? NOXH_STEPS : COMMERCIAL_STEPS;

  useEffect(() => {
    if (!choice) return;
    setShowResult(false);
    setShowInsight(false);
    const t = setTimeout(() => setShowResult(true), steps.length * 380 + 600);
    return () => clearTimeout(t);
  }, [choice]);

  const reset = () => {
    setChoice(null);
    setShowResult(false);
    setShowInsight(false);
  };

  return (
    <div ref={sectionRef} className="min-h-screen bg-secondary/25 py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <Tag>Vai trò 2 · Giám đốc Quỹ Đầu tư Bất động sản</Tag>
          <Headline>
            Bạn quản lý<br />hàng nghìn tỷ đồng.
          </Headline>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl leading-relaxed">
            Các cổ đông tin tưởng giao vốn để bạn tạo ra lợi nhuận. Hội đồng quản trị ra lệnh:{" "}
            <strong className="text-foreground">chọn một dự án để quỹ tài trợ.</strong>
          </p>
        </div>

        <AnimatePresence mode="wait">
          {choice === null ? (
            <motion.div
              key="choose"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid md:grid-cols-2 gap-6"
            >
              {[
                {
                  c: "noxh" as const,
                  icon: <Home className="w-7 h-7 text-accent" />,
                  bg: "bg-accent/8 hover:bg-accent/15 border-border hover:border-accent/40",
                  iconBg: "bg-accent/10 group-hover:bg-accent/20",
                  actionColor: "text-accent",
                  title: "Đầu tư vào Nhà ở Xã hội",
                  desc: "Dự án nhà ở dành cho người thu nhập thấp. Giá bán được Nhà nước khống chế để đảm bảo khả năng tiếp cận.",
                },
                {
                  c: "commercial" as const,
                  icon: <Building2 className="w-7 h-7 text-primary" />,
                  bg: "bg-primary/5 hover:bg-primary/12 border-border hover:border-primary/40",
                  iconBg: "bg-primary/10 group-hover:bg-primary/20",
                  actionColor: "text-primary",
                  title: "Đầu tư vào Chung cư Thương mại",
                  desc: "Dự án chung cư cao cấp tại vị trí đắc địa. Giá bán theo thị trường, nhắm phân khúc khách hàng thu nhập cao.",
                },
              ].map(opt => (
                <button
                  key={opt.c}
                  onClick={() => setChoice(opt.c)}
                  className={`group bg-card border ${opt.bg} p-8 text-left transition-all duration-300`}
                >
                  <div className={`w-14 h-14 ${opt.iconBg} flex items-center justify-center mb-6 transition-colors`}>
                    {opt.icon}
                  </div>
                  <h3 className="font-display text-xl font-bold text-foreground mb-3">{opt.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">{opt.desc}</p>
                  <div className={`flex items-center gap-2 ${opt.actionColor} text-xs font-bold tracking-[0.15em] uppercase`}>
                    Chọn phương án này
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="process"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {choice === "noxh"
                    ? <Home className="w-5 h-5 text-accent" />
                    : <Building2 className="w-5 h-5 text-primary" />}
                  <span className="font-display text-xl font-bold text-foreground">
                    {choice === "noxh" ? "Đầu tư vào Nhà ở Xã hội" : "Đầu tư vào Chung cư Thương mại"}
                  </span>
                </div>
                <button
                  onClick={reset}
                  className="font-mono text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                >
                  ← Chọn lại
                </button>
              </div>

              {/* Step flow */}
              <div className="bg-card border border-border p-6">
                <p className="font-mono text-[11px] tracking-[0.35em] uppercase text-muted-foreground mb-5">
                  Mô phỏng quá trình đầu tư
                </p>
                <div className="space-y-3">
                  {steps.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.35, duration: 0.4 }}
                      className="flex items-start gap-3"
                    >
                      <div
                        className={`w-6 h-6 flex-shrink-0 flex items-center justify-center text-[11px] font-mono font-bold mt-0.5 transition-colors ${
                          choice === "noxh"
                            ? "bg-accent/15 text-accent"
                            : "bg-primary/15 text-primary"
                        }`}
                      >
                        {i + 1}
                      </div>
                      <span className="text-sm text-foreground/80 leading-relaxed">{s}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Results */}
              <AnimatePresence>
                {showResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="bg-card border border-border overflow-hidden">
                      <div className="px-6 py-4 border-b border-border">
                        <p className="font-mono text-[11px] tracking-[0.35em] uppercase text-muted-foreground">Kết quả đầu tư</p>
                      </div>
                      <div className="divide-y divide-border">
                        {(choice === "noxh"
                          ? [
                              { label: "Gia đình được hỗ trợ có nhà ở", result: "↑ Cao", pos: true },
                              { label: "Hiệu quả đầu tư của quỹ", result: "↓ Thấp", pos: false },
                              { label: "Tỷ suất sinh lời", result: "↓ Giảm", pos: false },
                              { label: "Mức độ hài lòng của cổ đông", result: "↓ Thấp", pos: false },
                            ]
                          : [
                              { label: "Tỷ suất sinh lời của quỹ", result: "↑ Cao", pos: true },
                              { label: "Giá trị quỹ", result: "↑ Tăng", pos: true },
                              { label: "Mức độ hài lòng của cổ đông", result: "↑ Cao", pos: true },
                              { label: "Khả năng mở rộng đầu tư", result: "↑ Cao", pos: true },
                            ]
                        ).map(row => (
                          <div key={row.label} className="flex justify-between items-center px-6 py-3">
                            <span className="text-sm text-muted-foreground">{row.label}</span>
                            <span className={`font-mono text-sm font-bold ${row.pos ? "text-accent" : "text-primary"}`}>{row.result}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {choice === "noxh" ? (
                      <div className="bg-primary/8 border border-primary/30 p-6 space-y-3">
                        <p className="font-mono text-[11px] tracking-[0.35em] uppercase text-primary">Thông báo từ Hội đồng Quản trị</p>
                        <p className="text-sm text-foreground/75 leading-relaxed">
                          "Mặc dù dự án mang lại giá trị xã hội tích cực, hiệu quả đầu tư chưa đáp ứng kỳ vọng của quỹ. Hội đồng yêu cầu Ban điều hành xem xét điều chỉnh danh mục. Nếu kết quả không được cải thiện,{" "}
                          <strong className="text-foreground">vị trí điều hành của bạn sẽ được xem xét.</strong>"
                        </p>
                        <p className="font-display text-3xl font-black text-primary pt-2">BẠN BỊ SA THẢI.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-accent/8 border border-accent/25 p-6">
                          <p className="font-mono text-[11px] tracking-[0.35em] uppercase text-accent mb-2">Kết quả kinh doanh</p>
                          <p className="text-sm text-foreground/75 leading-relaxed">
                            Quỹ đạt mục tiêu lợi nhuận. Cổ đông hài lòng. Bạn được gia hạn hợp đồng và quỹ tiếp tục mở rộng vào phân khúc thương mại cao cấp.
                          </p>
                        </div>
                        <div className="bg-card border border-border p-6">
                          <p className="font-mono text-[11px] tracking-[0.35em] uppercase text-muted-foreground mb-2">Tuy nhiên...</p>
                          <p className="text-sm text-foreground/75 leading-relaxed">
                            Nguồn cung Nhà ở Xã hội tiếp tục thiếu hụt trầm trọng. Người thu nhập thấp vẫn không thể tiếp cận nhà ở. Và tất cả các quỹ khác cũng đưa ra quyết định tương tự.
                          </p>
                        </div>
                      </div>
                    )}

                    {!showInsight ? (
                      <div className="text-center pt-2">
                        <button
                          onClick={() => setShowInsight(true)}
                          className="group inline-flex items-center gap-3 border border-foreground/15 hover:border-accent/40 text-foreground/60 hover:text-accent font-bold text-xs tracking-[0.2em] uppercase px-8 py-3.5 transition-all duration-300"
                        >
                          Xem phân tích <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    ) : (
                      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="border-l-2 border-accent pl-6 py-1 space-y-4">
                          <p className="text-foreground/75 text-sm md:text-base leading-relaxed">
                            Ở góc độ quản lý quỹ đầu tư, cả hai quyết định đều có cơ sở hợp lý. Trong nền kinh tế thị trường, dòng vốn có xu hướng dịch chuyển đến những nơi có tỷ suất sinh lời cao hơn.
                          </p>
                          <p className="font-display text-xl font-bold text-accent">
                            Đây chính là cơ chế của "BÀN TAY VÔ HÌNH".
                          </p>
                          <p className="text-foreground/60 text-sm">
                            Nếu mọi quỹ và doanh nghiệp đều đưa ra quyết định như vậy —{" "}
                            <strong className="text-foreground">ai sẽ đầu tư vào Nhà ở Xã hội?</strong>
                          </p>
                        </div>
                        <div className="text-center pt-2">
                          <Next label="Tiếp tục" onClick={onNext} />
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Section 4 · Invisible Hand ───────────────────────────────────────────────

function Section4InvisibleHand({
  sectionRef,
  onNext,
}: {
  sectionRef: React.RefObject<HTMLDivElement>;
  onNext: () => void;
}) {
  const buildingData = [
    { h: 90, type: "luxury" },
    { h: 120, type: "luxury" },
    { h: 80, type: "luxury" },
    { h: 140, type: "luxury" },
    { h: 105, type: "luxury" },
    { h: 130, type: "luxury" },
    { h: 95, type: "luxury" },
    { h: 38, type: "social" },
  ];

  return (
    <div ref={sectionRef} className="min-h-screen bg-background py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-16 text-center">
          <Tag>Kinh tế học · Khái niệm cốt lõi</Tag>
          <Headline>
            "Bàn tay vô hình"<br />
            <span className="text-primary">và giới hạn của nó.</span>
          </Headline>
        </div>

        {/* Building animation */}
        <div className="bg-card border border-border p-8 mb-10">
          <p className="font-mono text-[11px] tracking-[0.35em] uppercase text-muted-foreground mb-8 text-center">
            Mô phỏng: Khi tất cả doanh nghiệp đồng loạt ưu tiên phân khúc cao cấp
          </p>
          <div className="flex items-end justify-center gap-1 sm:gap-4 h-44">
            {buildingData.map((b, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <span className={`font-mono text-[10px] uppercase ${b.type === "luxury" ? "text-primary/60" : "text-muted-foreground"}`}>
                  {b.type === "luxury" ? "CC" : "NOXH"}
                </span>
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  whileInView={{ height: b.h, opacity: 1 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ delay: i * 0.12, duration: 0.7, ease: "easeOut" }}
                  className={`w-6 sm:w-10 relative overflow-hidden ${b.type === "luxury" ? "bg-primary/70" : "bg-secondary"}`}
                  style={{ height: b.h }}
                >
                  <div className="absolute inset-x-0 top-1 grid grid-cols-2 gap-0.5 px-0.5">
                    {Array.from({ length: Math.floor(b.h / 14) }).map((_, j) => (
                      <div key={j} className={`h-1.5 ${b.type === "luxury" ? "bg-white/15" : "bg-white/8"}`} />
                    ))}
                  </div>
                </motion.div>
              </div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 1.4 }}
            className="flex flex-wrap justify-center gap-8 mt-8 pt-6 border-t border-border"
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground">Người dân xếp hàng</p>
                <p className="text-sm text-foreground font-bold">Nguồn cung NOXH thiếu hụt trầm trọng</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-accent" />
              <div>
                <p className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground">Hệ quả xã hội</p>
                <p className="text-sm text-foreground font-bold">Người không đủ điều kiện cố tìm cách mua chui</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Three pillars */}
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {[
            {
              icon: <TrendingUp className="w-6 h-6" />,
              title: "Doanh nghiệp tối đa hóa lợi nhuận",
              desc: "Đây là mục tiêu hợp lý và cần thiết để doanh nghiệp tồn tại và phát triển trong nền kinh tế thị trường.",
            },
            {
              icon: <ArrowRight className="w-6 h-6" />,
              title: "Nguồn lực chảy đến nơi sinh lời cao",
              desc: "Đất, vốn, nhân lực đều tập trung vào phân khúc có tỷ suất sinh lời cao nhất — đây là quy luật kinh tế.",
            },
            {
              icon: <AlertTriangle className="w-6 h-6" />,
              title: "Thất bại của thị trường xuất hiện",
              desc: "Khi người thu nhập thấp không thể tiếp cận nhà ở — thị trường tự do đã không tự giải quyết được.",
            },
          ].map(item => (
            <div key={item.title} className="bg-card border border-border p-6">
              <div className="text-accent mb-4">{item.icon}</div>
              <h3 className="font-display font-bold text-foreground mb-2.5 text-base">{item.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-primary/5 border border-primary/18 p-8 text-center mb-12">
          <p className="font-display text-xl md:text-2xl font-bold text-foreground max-w-2xl mx-auto leading-snug">
            Đây chính là lúc Nhà nước cần thực hiện{" "}
            <span className="text-primary">vai trò điều tiết</span> thông qua các công cụ chính sách.
          </p>
        </div>

        <div className="text-center">
          <Next label="So sánh hai mô hình kinh tế" onClick={onNext} />
        </div>
      </div>
    </div>
  );
}

// ─── Section 5 · Two Models ───────────────────────────────────────────────────

function Section5TwoModels({
  sectionRef,
  onNext,
}: {
  sectionRef: React.RefObject<HTMLDivElement>;
  onNext: () => void;
}) {
  return (
    <div ref={sectionRef} className="min-h-screen bg-secondary/20 py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 text-center">
          <Tag>Kinh tế học · So sánh mô hình</Tag>
          <Headline>
            Hai mô hình kinh tế,<br />hai kết quả.
          </Headline>
        </div>

        {/* Split comparison */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Left */}
          <div className="bg-card border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-foreground/4">
              <p className="font-display text-base font-bold text-foreground">Kinh tế thị trường Tư bản chủ nghĩa</p>
            </div>
            <div className="p-6 space-y-2">
              {["Lợi nhuận", "Thị trường", "Doanh nghiệp", "Chung cư cao cấp", "Người giàu"].map((item, i, arr) => (
                <div key={item}>
                  <FlowBox label={item} variant="neutral" />
                  {i < arr.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 space-y-2.5">
              <p className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground mb-3">Đặc điểm</p>
              {[
                "Lợi nhuận là mục tiêu tối thượng",
                "Nhà nước can thiệp tối thiểu",
                "Thị trường tự điều tiết hoàn toàn",
              ].map(d => (
                <div key={d} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-primary/60 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{d}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right */}
          <div className="bg-card border border-accent/30 overflow-hidden relative">
            <div className="absolute top-3.5 right-4">
              <span className="bg-accent text-background text-[10px] font-mono font-black px-2 py-0.5 uppercase tracking-wider">
                Việt Nam
              </span>
            </div>
            <div className="px-6 py-4 border-b border-accent/20 bg-accent/6">
              <p className="font-display text-base font-bold text-foreground">Kinh tế thị trường định hướng XHCN</p>
            </div>
            <div className="p-6 space-y-2">
              {["Thị trường", "Nhà nước điều tiết", "Doanh nghiệp", "NOXH + Thương mại", "Người dân", "An sinh xã hội"].map((item, i, arr) => (
                <div key={item}>
                  <FlowBox label={item} variant="accent" />
                  {i < arr.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowDown className="w-3.5 h-3.5 text-accent/60" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 space-y-2.5">
              <p className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground mb-3">Đặc điểm</p>
              {[
                "Tăng trưởng gắn với công bằng xã hội",
                "Nhà nước điều tiết bằng công cụ kinh tế",
                "Phát triển bền vững, toàn diện",
              ].map(d => (
                <div key={d} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Comparison table */}
        <div className="bg-card border border-border overflow-hidden mb-12">
          <div className="px-6 py-4 border-b border-border">
            <p className="font-mono text-[11px] tracking-[0.35em] uppercase text-muted-foreground">Bảng so sánh trực tiếp</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left font-mono text-[11px] tracking-wider uppercase text-muted-foreground">Tiêu chí</th>
                  <th className="px-6 py-3 text-left font-mono text-[11px] tracking-wider uppercase text-muted-foreground">Tư bản thuần túy</th>
                  <th className="px-6 py-3 text-left font-mono text-[11px] tracking-wider uppercase text-accent">KTTT định hướng XHCN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["Mục tiêu ưu tiên", "Tối đa hóa lợi nhuận", "Tăng trưởng + Công bằng xã hội"],
                  ["Vai trò Nhà nước", "Tối thiểu hóa can thiệp", "Điều tiết chủ động bằng chính sách"],
                  ["Phân phối nguồn lực", "Hoàn toàn theo tín hiệu giá", "Có định hướng xã hội"],
                  ["Nhà ở người thu nhập thấp", "Phụ thuộc hoàn toàn thị trường", "Có chính sách hỗ trợ cụ thể"],
                  ["Kết quả tổng thể", "Tăng trưởng nhanh, bất bình đẳng cao", "Tăng trưởng bền vững, công bằng hơn"],
                ].map(([crit, cap, soc]) => (
                  <tr key={crit}>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{crit}</td>
                    <td className="px-6 py-3 text-sm text-foreground/60">{cap}</td>
                    <td className="px-6 py-3 text-sm text-accent font-medium">{soc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-center">
          <Next label="Bạn trở thành Nhà nước" onClick={onNext} />
        </div>
      </div>
    </div>
  );
}

// ─── Section 6 · Government Dashboard ────────────────────────────────────────

function Section6Government({
  sectionRef,
  onNext,
}: {
  sectionRef: React.RefObject<HTMLDivElement>;
  onNext: () => void;
}) {
  const [policies, setPolicies] = useState<Record<PolicyKey, boolean>>({
    exemptLand: false,
    reduceTax: false,
    preferentialLoan: false,
    interestSupport: false,
    streamlineProcedure: false,
  });

  const metrics = computeMetrics(policies);
  const activeCount = Object.values(policies).filter(Boolean).length;

  const chartData = [
    { name: "Lợi nhuận DN (%)", before: 5,  after: metrics.profit,   color: "#F4A261" },
    { name: "Khả năng mua nhà (%)", before: 28, after: metrics.access,   color: "#4CAF82" },
    { name: "Nguồn cung NOXH", before: 15, after: metrics.supply,   color: "#6BB8F5" },
    { name: "Dòng tiền DN", before: 30, after: metrics.cashflow, color: "#B48EF5" },
  ];

  const toggle = useCallback((k: PolicyKey) => {
    setPolicies(p => ({ ...p, [k]: !p[k] }));
  }, []);

  return (
    <div ref={sectionRef} className="min-h-screen bg-background py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <Tag>Vai trò 3 · Nhà nước · Điều hành nền kinh tế</Tag>
          <Headline>
            Bạn điều chỉnh<br />điều kiện thị trường.
          </Headline>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl leading-relaxed">
            Nhà nước <em>không ép buộc</em> doanh nghiệp xây NOXH. Thay vào đó, hãy điều chỉnh{" "}
            <strong className="text-foreground">các điều kiện thị trường</strong> để doanh nghiệp vẫn có lợi nhuận và người dân có cơ hội mua nhà.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Toggles */}
          <div>
            <p className="font-mono text-[11px] tracking-[0.35em] uppercase text-muted-foreground mb-5">
              Công cụ chính sách — bật để kích hoạt
            </p>
            <div className="space-y-3">
              {POLICIES.map(p => (
                <button
                  key={p.key}
                  onClick={() => toggle(p.key)}
                  aria-pressed={policies[p.key]}
                  aria-label={`${policies[p.key] ? "Tắt" : "Bật"} chính sách ${p.label}`}
                  className={`w-full flex items-center gap-4 p-4 border text-left transition-all duration-300 ${
                    policies[p.key]
                      ? "bg-accent/8 border-accent/35"
                      : "bg-card border-border hover:border-foreground/15"
                  }`}
                >
                  <div
                    className={`w-11 h-6 flex-shrink-0 relative transition-colors duration-300 ${
                      policies[p.key] ? "bg-accent" : "bg-secondary"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white shadow transition-transform duration-300 ${
                        policies[p.key] ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold transition-colors ${policies[p.key] ? "text-accent" : "text-foreground"}`}>
                      {p.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                  </div>
                  {policies[p.key] && <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />}
                </button>
              ))}
            </div>

            <AnimatePresence>
              {activeCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-5 bg-accent/5 border border-accent/18 p-4"
                >
                  <p className="font-mono text-[11px] uppercase tracking-wider text-accent mb-1">
                    {activeCount} chính sách đang hoạt động
                  </p>
                  <p className="text-sm text-foreground/65 leading-relaxed">
                    Nhà nước không ép — Nhà nước <strong className="text-foreground">tạo điều kiện</strong>. Doanh nghiệp vẫn có lợi nhuận, người dân có cơ hội có nhà.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Chart & metrics */}
          <div>
            <p className="font-mono text-[11px] tracking-[0.35em] uppercase text-muted-foreground mb-5">
              Tác động — thay đổi theo thời gian thực
            </p>
            <div className="bg-card border border-border p-6 mb-4">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }}>
                  <XAxis
                    type="number"
                    domain={[0, 90]}
                    tick={{ fontSize: 10, fill: "#7D8FA8", fontFamily: "JetBrains Mono, monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={145}
                    tick={{ fontSize: 10, fill: "#7D8FA8", fontFamily: "JetBrains Mono, monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0C1428",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 0,
                      fontSize: 11,
                      fontFamily: "JetBrains Mono, monospace",
                      color: "#EEF0F7",
                    }}
                    formatter={(val: number, name: string) => [val, name === "before" ? "Không có chính sách" : "Có chính sách"]}
                  />
                  <Bar dataKey="before" name="before" fill="#1E2D47" radius={0} maxBarSize={14} />
                  <Bar dataKey="after" name="after" radius={0} maxBarSize={14}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-5 mt-3 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-secondary" />
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Không có chính sách</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-accent" />
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Có chính sách</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Lợi nhuận DN", value: metrics.profit, unit: "%", color: "text-[#F4A261]" },
                { label: "Khả năng mua nhà", value: metrics.access, unit: "%", color: "text-[#4CAF82]" },
                { label: "Nguồn cung NOXH", value: metrics.supply, unit: " đv", color: "text-[#6BB8F5]" },
                { label: "Dòng tiền DN", value: metrics.cashflow, unit: " đv", color: "text-[#B48EF5]" },
              ].map(m => (
                <div key={m.label} className="bg-card border border-border p-4">
                  <p className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground mb-1.5">{m.label}</p>
                  <p className={`font-display text-2xl font-black ${m.color}`}>
                    {m.value}<span className="text-sm font-normal text-muted-foreground">{m.unit}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-16">
          {activeCount > 0 ? (
            <Next label="Hoàn thiện thể chế" onClick={onNext} />
          ) : (
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Hãy kích hoạt ít nhất một chính sách để tiếp tục
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section 7 · Institution ──────────────────────────────────────────────────

function Section7Institution({
  sectionRef,
  onNext,
}: {
  sectionRef: React.RefObject<HTMLDivElement>;
  onNext: () => void;
}) {
  const [verifying, setVerifying] = useState(false);
  const [richResult, setRichResult] = useState<boolean | null>(null);
  const [poorResult, setPoorResult] = useState<boolean | null>(null);

  const runVerification = useCallback(() => {
    if (verifying) return;
    setVerifying(true);
    setRichResult(null);
    setPoorResult(null);
    setTimeout(() => setRichResult(false), 1400);
    setTimeout(() => setPoorResult(true), 2600);
    setTimeout(() => setVerifying(false), 3000);
  }, [verifying]);

  const done = richResult !== null && poorResult !== null;

  return (
    <div ref={sectionRef} className="min-h-screen bg-secondary/20 py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <Tag>Thể chế kinh tế · AI kiểm tra và xác minh</Tag>
          <Headline>
            Kiểm soát<br />đúng đối tượng.
          </Headline>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl leading-relaxed">
            Hoàn thiện thể chế là yếu tố then chốt: thông qua pháp luật minh bạch và số hóa, Nhà nước đảm bảo NOXH đến đúng tay người cần — không bị lợi dụng.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Applicant 1 */}
          <div className={`bg-card border transition-all duration-500 overflow-hidden ${richResult === false ? "border-primary/45" : "border-border"}`}>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-foreground/8 flex items-center justify-center text-2xl">🏡</div>
                <div>
                  <p className="font-bold text-foreground">Nguyễn Văn Phú</p>
                  <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider">Doanh nhân · Thu nhập cao</p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                {[
                  { label: "Thu nhập/tháng", value: "85 triệu đồng" },
                  { label: "Đang sở hữu", value: "2 căn hộ tại Q.7 và Q.1" },
                  { label: "Tài sản bất động sản", value: "> 15 tỷ đồng" },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center">
                    <span className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground">{row.label}</span>
                    <span className="text-sm text-foreground font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
              <AnimatePresence>
                {richResult !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-primary/8 border border-primary/30 p-4 flex items-center gap-3"
                  >
                    <XCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-primary font-bold text-sm">Không đủ điều kiện</p>
                      <p className="font-mono text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">Phát hiện: thu nhập cao, đang sở hữu BĐS</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Applicant 2 */}
          <div className={`bg-card border transition-all duration-500 overflow-hidden ${poorResult === true ? "border-accent/45" : "border-border"}`}>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-foreground/8 flex items-center justify-center text-2xl">👨‍👩‍👧</div>
                <div>
                  <p className="font-bold text-foreground">Trần Gia Hạnh</p>
                  <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider">Công nhân · Thu nhập thấp</p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                {[
                  { label: "Thu nhập/tháng", value: "8,5 triệu đồng" },
                  { label: "Đang sở hữu", value: "Không có nhà, đang thuê trọ" },
                  { label: "Tài sản bất động sản", value: "Không có" },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center">
                    <span className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground">{row.label}</span>
                    <span className="text-sm text-foreground font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
              <AnimatePresence>
                {poorResult !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-accent/8 border border-accent/30 p-4 flex items-center gap-3"
                  >
                    <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                    <div>
                      <p className="text-accent font-bold text-sm">Đủ điều kiện mua NOXH</p>
                      <p className="font-mono text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">Xác minh: thu nhập hợp lệ, chưa có nhà ở</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="text-center mb-10">
          {!done ? (
            <button
              onClick={runVerification}
              disabled={verifying}
              className={`group inline-flex items-center gap-3 border font-bold text-xs tracking-[0.2em] uppercase px-8 py-3.5 transition-all duration-300 ${
                verifying
                  ? "border-foreground/10 text-muted-foreground cursor-wait"
                  : "border-foreground/15 hover:border-accent/40 text-foreground/60 hover:text-accent"
              }`}
            >
              <Shield className="w-4 h-4" />
              {verifying ? "AI đang kiểm tra hồ sơ..." : "Chạy AI kiểm tra điều kiện"}
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border p-6 max-w-2xl mx-auto"
            >
              <p className="font-mono text-[11px] tracking-[0.35em] uppercase text-muted-foreground mb-3">Giải thích</p>
              <p className="text-foreground/75 text-sm leading-relaxed">
                Đây là{" "}
                <strong className="text-foreground">hoàn thiện thể chế kinh tế thị trường định hướng XHCN</strong> —
                thông qua pháp luật minh bạch, số hóa và kiểm soát tự động, Nhà nước đảm bảo nguồn lực công đến đúng đối tượng cần hỗ trợ, không bị lạm dụng.
              </p>
            </motion.div>
          )}
        </div>

        {done && (
          <div className="text-center">
            <Next label="Xem kết luận tổng thể" onClick={onNext} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section 8 · Summary ─────────────────────────────────────────────────────

function Section8Summary({ sectionRef }: { sectionRef: React.RefObject<HTMLDivElement> }) {
  return (
    <div ref={sectionRef} className="min-h-screen bg-background py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-16 text-center">
          <Tag>Kết luận · Kinh tế thị trường định hướng XHCN</Tag>
          <Headline>
            Cân bằng lợi ích —<br />
            <span className="text-accent">hướng tới công bằng.</span>
          </Headline>
        </div>

        {/* Balance */}
        <div className="bg-card border border-border p-8 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6 items-center">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-accent/8 border border-accent/25 flex items-center justify-center mx-auto">
                <Building2 className="w-8 h-8 text-accent" />
              </div>
              <p className="font-display font-bold text-foreground">Doanh nghiệp</p>
              <div className="space-y-1.5">
                {["Có lợi nhuận hợp lý", "Môi trường đầu tư tốt"].map(t => (
                  <div key={t} className="flex items-center gap-2 justify-center">
                    <CheckCircle className="w-3.5 h-3.5 text-accent" />
                    <span className="text-xs text-foreground/70">{t}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-primary/8 border border-primary/25 flex items-center justify-center mx-auto mb-4">
                <Landmark className="w-10 h-10 text-primary" />
              </div>
              <p className="font-display font-bold text-primary text-xl">Nhà nước</p>
              <p className="font-mono text-[10px] text-muted-foreground mt-2 uppercase tracking-wider">Điều tiết · Cân bằng</p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-accent/8 border border-accent/25 flex items-center justify-center mx-auto">
                <Users className="w-8 h-8 text-accent" />
              </div>
              <p className="font-display font-bold text-foreground">Người dân</p>
              <div className="space-y-1.5">
                {["Có cơ hội có nhà", "An sinh xã hội đảm bảo"].map(t => (
                  <div key={t} className="flex items-center gap-2 justify-center">
                    <CheckCircle className="w-3.5 h-3.5 text-accent" />
                    <span className="text-xs text-foreground/70">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Key message */}
        <div className="bg-primary/4 border border-primary/15 p-10 mb-10 text-center">
          <p className="font-display text-xl md:text-2xl font-bold text-foreground max-w-3xl mx-auto leading-snug">
            Kinh tế thị trường định hướng XHCN{" "}
            <span className="text-primary">không phủ nhận</span> quy luật thị trường.
          </p>
          <p className="text-foreground/65 text-sm md:text-base mt-5 max-w-3xl mx-auto leading-relaxed">
            Thay vào đó, Nhà nước sử dụng{" "}
            <strong className="text-foreground">các công cụ kinh tế và thể chế</strong> để khắc phục thất bại của thị trường, điều hòa lợi ích giữa doanh nghiệp và người dân, hướng tới mục tiêu:
          </p>
          <p className="font-display text-2xl md:text-3xl font-black text-accent mt-6">
            "Dân giàu, nước mạnh, dân chủ, công bằng, văn minh"
          </p>
        </div>

        {/* Journey recap */}
        <div className="grid md:grid-cols-3 gap-5 mb-16">
          {[
            {
              icon: "🏠",
              role: "Người dân",
              insight: "Hiểu được rào cản tài chính thực tế khi muốn tiếp cận nhà ở trong thị trường hiện tại — 81 năm mới đủ tiền mua nhà.",
            },
            {
              icon: "📊",
              role: "Giám đốc Quỹ Đầu tư",
              insight: "Nhận ra vì sao logic lợi nhuận dẫn dắt dòng vốn khỏi NOXH — đây là quy luật thị trường, không phải lỗi của doanh nghiệp.",
            },
            {
              icon: "⚖️",
              role: "Nhà nước",
              insight: "Trải nghiệm điều tiết thị trường bằng công cụ kinh tế thay vì mệnh lệnh hành chính — tạo điều kiện để thị trường tự vận hành tốt hơn.",
            },
          ].map(item => (
            <div key={item.role} className="bg-card border border-border p-6">
              <div className="text-3xl mb-4">{item.icon}</div>
              <p className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground mb-1.5">Vai trò</p>
              <p className="font-display font-bold text-foreground mb-3">{item.role}</p>
              <p className="text-muted-foreground text-sm leading-relaxed">{item.insight}</p>
            </div>
          ))}
        </div>

        <div className="text-center border-t border-border pt-10">
          <p className="font-mono text-[11px] tracking-[0.4em] uppercase text-muted-foreground/50">
            CHUYỆN NHÀ ĐẤT, CẦN NHÀ NƯỚC · Phân tích Kinh tế Chính trị · 2024
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Nav progress dots ────────────────────────────────────────────────────────

function NavDots({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <div className="fixed right-5 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2.5 items-center">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="group relative flex items-center">
          <div
            className={`w-1.5 h-1.5 transition-all duration-300 ${
              i === current
                ? "bg-accent scale-125"
                : i < current
                ? "bg-foreground/30"
                : "bg-foreground/12"
            }`}
          />
          <div className="absolute right-5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap bg-card border border-border px-2 py-1">
              {labels[i]}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

const NAV_LABELS = [
  "Trang chủ",
  "Người dân",
  "Giám đốc quỹ",
  "Bàn tay vô hình",
  "Hai mô hình",
  "Nhà nước",
  "Thể chế",
  "Kết luận",
];

export default function App() {
  const s2 = useRef<HTMLDivElement>(null);
  const s3 = useRef<HTMLDivElement>(null);
  const s4 = useRef<HTMLDivElement>(null);
  const s5 = useRef<HTMLDivElement>(null);
  const s6 = useRef<HTMLDivElement>(null);
  const s7 = useRef<HTMLDivElement>(null);
  const s8 = useRef<HTMLDivElement>(null);
  const [currentSection, setCurrentSection] = useState(0);

  const go = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const refs = [null, s2, s3, s4, s5, s6, s7, s8];
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = refs.findIndex(r => r?.current === entry.target);
            if (idx >= 0) setCurrentSection(idx);
          }
        });
      },
      { threshold: 0.4 }
    );
    refs.slice(1).forEach(r => r?.current && observer.observe(r.current));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-background text-foreground overflow-x-hidden font-sans">
      <NavDots current={currentSection} total={8} labels={NAV_LABELS} />
      <Section1Hero onNext={() => go(s2)} />
      <Section2Student sectionRef={s2} onNext={() => go(s3)} />
      <Section3Investor sectionRef={s3} onNext={() => go(s4)} />
      <Section4InvisibleHand sectionRef={s4} onNext={() => go(s5)} />
      <Section5TwoModels sectionRef={s5} onNext={() => go(s6)} />
      <Section6Government sectionRef={s6} onNext={() => go(s7)} />
      <Section7Institution sectionRef={s7} onNext={() => go(s8)} />
      <Section8Summary sectionRef={s8} />
    </div>
  );
}
