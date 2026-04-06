import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ════════════════════════════════════════════════════════════════════════════
   LABEL SYSTEM — OOP-level labels with interactive definitions
   ════════════════════════════════════════════════════════════════════════════
   
   This page uses labels from the OOP domain:
     OBJ-x   Object design rules (encapsulation mechanics)
     POLY-x  Polymorphism rules (type substitution)
     PRT-x   Protocol rules (abstraction boundaries)
     DEC-x   Decorators (implementation mechanisms)
     PAT-x   Design patterns (structural solutions)
   
   CAT-x, TDD, FT-x labels appear as cross-references only — 
   their full definitions live in Section 9, 7, and 10 respectively.
*/

const LABEL_FAMILIES = {
  obj:  { label: "Object Rule",    color: "#6ee7b7", bg: "rgba(110,231,183,0.10)", border: "rgba(110,231,183,0.25)", icon: "◻" },
  poly: { label: "Polymorphism",   color: "#fcd34d", bg: "rgba(252,211,77,0.10)",  border: "rgba(252,211,77,0.25)",  icon: "◈" },
  prt:  { label: "Protocol",       color: "#79b8ff", bg: "rgba(121,184,255,0.10)", border: "rgba(121,184,255,0.25)", icon: "◫" },
  dec:  { label: "Decorator",      color: "#e8a87c", bg: "rgba(232,168,124,0.10)", border: "rgba(232,168,124,0.25)", icon: "◇" },
  pat:  { label: "Pattern",        color: "#fcd34d", bg: "rgba(252,211,77,0.10)",  border: "rgba(252,211,77,0.25)",  icon: "◎" },
  cat:  { label: "Category",       color: "#85cdca", bg: "rgba(133,205,202,0.10)", border: "rgba(133,205,202,0.25)", icon: "◆" },
  tax:  { label: "Taxonomy",       color: "#c49bde", bg: "rgba(196,155,222,0.10)", border: "rgba(196,155,222,0.25)", icon: "◈" },
  tdd:  { label: "TDD Template",   color: "#79b8ff", bg: "rgba(121,184,255,0.10)", border: "rgba(121,184,255,0.25)", icon: "▣" },
  mixin:{ label: "Mixin",          color: "#e8a87c", bg: "rgba(232,168,124,0.10)", border: "rgba(232,168,124,0.25)", icon: "◇" },
};

const LABELS = {
  // ── Object rules (Encapsulation) ──
  "OBJ-1":  { fam: "obj",  name: "Fixed Layout",       def: "__slots__ — prevents typo attributes, saves memory. No __dict__." },
  "OBJ-2":  { fam: "obj",  name: "Defensive Copy",     def: "Copy mutable collections on intake and output. Prevents alias mutation." },
  // ── Polymorphism rules ──
  "POLY-1": { fam: "poly", name: "Inheritance Policy",  def: "Max 1 concrete base. Multiple inheritance = concrete + mixins/ABCs only." },
  "POLY-2": { fam: "poly", name: "Poly Strategy",       def: "Default duck typing + Protocol. Inheritance only for shared implementation." },
  // ── Protocol rules (Abstraction) ──
  "PRT-1":  { fam: "prt",  name: "runtime_checkable",   def: "Enables isinstance() checks on Protocol. Useful for test assertions." },
  "PRT-2":  { fam: "prt",  name: "IO Boundary Protocol", def: "Always define Protocol at DB/API/queue boundary. Even with one impl." },
  "PRT-3":  { fam: "prt",  name: "Structural Typing",   def: "No forced inheritance. Cross-package compatibility. Static checking." },
  "PRT-4":  { fam: "prt",  name: "In-Memory Fake",      def: "Test double implementing Protocol. No real DB/API needed in unit tests." },
  "PRT-5":  { fam: "prt",  name: "Plugin Protocol",     def: "Extension point for third-party implementations." },
  // ── Decorators ──
  "DEC-1":   { fam: "dec", name: "@property",           def: "Attribute-like access with encapsulation. Getter = query, setter = validated mutation." },
  "DEC-1.1": { fam: "dec", name: "Simple Getter",       def: "@property — direct field access or trivial derivation. Cheap (<1ms)." },
  "DEC-1.2": { fam: "dec", name: "Computed Property",   def: "@property — value derived from multiple fields. Recalculated each access." },
  "DEC-1.3": { fam: "dec", name: "Validated Setter",    def: "@property.setter — enforces constraints before assignment. Justifies @property." },
  "DEC-2":   { fam: "dec", name: "@classmethod",        def: "Alternative constructors. Receives cls. Factory for multiple construction paths." },
  "DEC-3":   { fam: "dec", name: "@staticmethod",       def: "Pure utility in class namespace. No self/cls. Deterministic." },
  "DEC-5":   { fam: "dec", name: "@abstractmethod",     def: "Interface contract. Forces subclasses to implement. Cannot instantiate incomplete." },
  // ── Patterns ──
  "PAT-4":  { fam: "pat",  name: "Facade",              def: "Hide subsystem complexity behind a single entry point." },
  "PAT-6":  { fam: "pat",  name: "Strategy",            def: "Swap algorithms at runtime via Protocol conformance." },
  "PAT-9":  { fam: "pat",  name: "Template Method",     def: "Algorithm skeleton in base class. Subclasses fill in the variable steps." },
  // ── Cross-references (brief — full defs in their home sections) ──
  "CAT-1":  { fam: "cat",  name: "Query",               def: "Reads state, returns value, no side effects. → Section 9" },
  "CAT-2":  { fam: "cat",  name: "Mutation",             def: "Changes internal state, returns None. → Section 9" },
  "CAT-5":  { fam: "cat",  name: "Validation",           def: "Checks constraints. Bool or raises. → Section 9" },
  "CAT-7":  { fam: "cat",  name: "Property",             def: "Attribute-like access. Getter=query, setter=mutation. → Section 9" },
  // ── TDD cross-refs ──
  "ADV-2":  { fam: "tdd",  name: "Property Testing",    def: "Test getter idempotence, setter validation. → Section 7" },
  "B.1.4":  { fam: "tdd",  name: "State Mutation",      def: "Capture before, mutate, verify after. scope=\"function\". → Section 7" },
  "B.2.1":  { fam: "tdd",  name: "ABC Contract",        def: "Verify abstract methods enforced. Test shared implementation. → Section 7" },
  "B.2.2":  { fam: "tdd",  name: "Concrete Impl",       def: "Test concrete class satisfies base contract. → Section 7" },
  "B.2.3":  { fam: "tdd",  name: "Shared Behaviour",    def: "All implementations pass identical test suite. → Section 7" },
  "B.2.4":  { fam: "tdd",  name: "LSP Substitution",    def: "Parametrize tests across all implementations. → Section 7" },
  // ── Mixin ──
  "ADV-MIXIN-1": { fam: "mixin", name: "Mixin Pattern", def: "Cross-cutting behaviour. No domain data. Must call super() in every method." },
};

function getLabelInfo(label) {
  const info = LABELS[label];
  if (!info) return { name: label, def: "", fam: "cat", ...LABEL_FAMILIES.cat };
  const fam = LABEL_FAMILIES[info.fam] || LABEL_FAMILIES.cat;
  return { ...info, ...fam };
}


/* ════════════════════════════════════════════════════════════════════════════
   COMPONENTS
   ════════════════════════════════════════════════════════════════════════════ */

function RefTag({ label }) {
  const [show, setShow] = useState(false);
  const info = getLabelInfo(label);
  return (
    <span className="ref-tag" style={{ color: info.color, background: info.bg, borderColor: info.border }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span className="ref-icon" style={{ color: info.color }}>{info.icon}</span>
      {label}
      {show && info.def && (
        <span className="ref-tip" style={{ borderColor: info.border }}>
          <span className="ref-tip-head">
            <span className="ref-tip-fam" style={{ color: info.color }}>{info.label}</span>
            <span className="ref-tip-name">{info.name}</span>
          </span>
          <span className="ref-tip-def">{info.def}</span>
        </span>
      )}
    </span>
  );
}

function LabelLegend() {
  const [open, setOpen] = useState(false);
  const families = [
    { key: "obj",  examples: ["OBJ-1","OBJ-2"], scope: "Encapsulation mechanics" },
    { key: "poly", examples: ["POLY-1","POLY-2"], scope: "Type substitution rules" },
    { key: "prt",  examples: ["PRT-2","PRT-4"], scope: "Abstraction boundaries" },
    { key: "dec",  examples: ["DEC-1","DEC-5"], scope: "Implementation mechanisms" },
    { key: "pat",  examples: ["PAT-4","PAT-6","PAT-9"], scope: "Structural solutions" },
  ];
  return (
    <div className="label-legend">
      <button className="legend-toggle" onClick={() => setOpen(!open)}>
        <span>{open ? "▾" : "▸"}</span>
        <span style={{flex:1}}>Label Families on This Page</span>
        <span className="legend-count">{Object.keys(LABELS).length} labels</span>
      </button>
      {open && <div className="legend-body">
        {families.map(f => {
          const fam = LABEL_FAMILIES[f.key];
          return <div key={f.key} className="legend-row">
            <span className="legend-icon" style={{color:fam.color}}>{fam.icon}</span>
            <span className="legend-fam" style={{color:fam.color}}>{fam.label}</span>
            <span className="legend-scope">{f.scope}</span>
            <span className="legend-tags">{f.examples.map(e => <RefTag key={e} label={e}/>)}</span>
          </div>;
        })}
        <div className="legend-xref">Labels like <RefTag label="CAT-1"/> and <RefTag label="B.1.4"/> are cross-references — their full definitions live in Sections 7, 9, and 10.</div>
      </div>}
    </div>
  );
}

// ─── Syntax highlighter ─────────────────────────────────────────────────────
const KW = new Set(["class","def","return","if","elif","else","for","while","import","from","pass","raise","None","True","False","self","not","and","or","in","is","with","as","try","except","finally","yield","async","await","lambda","break","continue","del","assert"]);
const BI = new Set(["int","str","float","bool","dict","list","tuple","set","frozenset","type","super","isinstance","property","classmethod","staticmethod","abstractmethod","len","sum","range","print","hash","getattr","setattr","hasattr","object"]);

function hl(code) {
  if (!code) return "";
  const ph = []; const p = h => { const id = `\x00${ph.length}\x00`; ph.push(h); return id; };
  let s = code.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  s = s.replace(/"""[\s\S]*?"""|'''[\s\S]*?'''/g, m => p(`<span class="hl-str">${m}</span>`));
  s = s.replace(/#[^\n]*/g, m => p(`<span class="hl-cmt">${m}</span>`));
  s = s.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, m => p(`<span class="hl-str">${m}</span>`));
  s = s.replace(/^(\s*)(@\w+)/gm, (_,w,d) => w + p(`<span class="hl-dec">${d}</span>`));
  s = s.replace(/\[[A-Z][\w.-]*\]/g, m => p(`<span class="hl-lbl">${m}</span>`));
  s = s.replace(/\b([A-Za-z_]\w*)\b/g, m => KW.has(m)?p(`<span class="hl-kw">${m}</span>`):BI.has(m)?p(`<span class="hl-bi">${m}</span>`):m);
  let r = s; for (let i = ph.length-1; i >= 0; i--) r = r.replace(`\x00${i}\x00`, ph[i]); return r;
}

function Code({ code, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="code-block">
      {label && <div className="code-label">{label}</div>}
      <button className="copy-btn" onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(()=>setCopied(false),1500); }}>{copied?"✓":"⧉"}</button>
      <pre><code dangerouslySetInnerHTML={{__html:hl(code)}}/></pre>
    </div>
  );
}

function AntiPatternCard({ ap }) {
  const [showFix, setShowFix] = useState(false);
  return (
    <div className="ap-card">
      <div className="ap-header">
        <div className="ap-badge">⚠ {ap.id}</div>
        <h4>{ap.name}</h4>
        <p className="ap-symptom">{ap.symptom}</p>
        {ap.drift && <p className="ap-drift">↳ {ap.drift}</p>}
        {ap.labels && <div className="ap-tags">{ap.labels.map(l => <RefTag key={l} label={l}/>)}</div>}
      </div>
      <div className="ap-bar">
        <button className={`ap-btn ${!showFix?"on":""}`} onClick={()=>setShowFix(false)}>✗ Anti-Pattern</button>
        <button className={`ap-btn ${showFix?"on":""}`} onClick={()=>setShowFix(true)}>✓ Fix</button>
      </div>
      <Code code={showFix ? ap.fix : ap.bad}/>
    </div>
  );
}

function PillarSection({ pillar, isActive }) {
  const [exOpen, setExOpen] = useState(true);
  const [apOpen, setApOpen] = useState(false);
  const [tdOpen, setTdOpen] = useState(false);

  return (
    <section className={`pillar ${isActive?"active":""}`} id={pillar.id}>
      <div className="p-head">
        <div className="p-num">{pillar.num}</div>
        <div>
          <div className="p-label">{pillar.label}</div>
          <h2>{pillar.title}</h2>
          <p className="p-tag">{pillar.tagline}</p>
        </div>
      </div>
      <div className="p-def"><p>{pillar.definition}</p></div>
      <div className="p-rule"><span className="p-rule-icon">→</span><span>{pillar.keyRule}</span></div>

      <div className="mech-row">
        <span className="row-label">Core Mechanism</span>
        <div className="mech-tags">{pillar.mechanism.map(m => <span key={m} className="mech-tag">{m}</span>)}</div>
      </div>
      <div className="refs-row">
        <div><span className="row-label">Cross-refs</span><div className="ref-tags">{pillar.crossRefs.map(r => <RefTag key={r} label={r}/>)}</div></div>
        <div><span className="row-label">Test Templates</span><div className="ref-tags">{pillar.testTemplates.map(r => <RefTag key={r} label={r}/>)}</div></div>
      </div>
      <div className="p-default"><span className="row-label">Default</span><span>{pillar.defaultApproach}</span></div>

      {pillar.tradeOffs && <div className="coll">
        <button className="coll-btn td-btn" onClick={()=>setTdOpen(!tdOpen)}>
          <span>{tdOpen?"▾":"▸"}</span><span>Trade-off Analysis</span><span className="coll-count">{pillar.tradeOffs.rows.length}</span>
        </button>
        {tdOpen && <div className="coll-body"><div className="tbl-wrap"><table>
          <thead><tr>{pillar.tradeOffs.headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{pillar.tradeOffs.rows.map((row,i) => <tr key={i}>{row.map((c,j) => <td key={j} className={j===0?"td-app":""}>{c}</td>)}</tr>)}</tbody>
        </table></div></div>}
      </div>}

      <div className="coll">
        <button className="coll-btn" onClick={()=>setExOpen(!exOpen)}>
          <span>{exOpen?"▾":"▸"}</span><span>GigMaster Examples</span><span className="coll-count">{pillar.examples.length}</span>
        </button>
        {exOpen && <div className="coll-body">{pillar.examples.map(ex => (
          <div key={ex.id} className="ex-card">
            <div className="ex-head"><span>{ex.title}</span><div className="ex-refs">{ex.refs.map(r => <RefTag key={r} label={r}/>)}</div></div>
            <Code code={ex.code}/>
          </div>
        ))}</div>}
      </div>

      <div className="coll">
        <button className="coll-btn ap-btn-head" onClick={()=>setApOpen(!apOpen)}>
          <span>{apOpen?"▾":"▸"}</span><span>Anti-Patterns</span><span className="coll-count warn">{pillar.antiPatterns.length}</span>
        </button>
        {apOpen && <div className="coll-body">{pillar.antiPatterns.map(ap => <AntiPatternCard key={ap.id} ap={ap}/>)}</div>}
      </div>
    </section>
  );
}


/* ════════════════════════════════════════════════════════════════════════════
   DATA — The Four Pillars (enhanced with drift explanations + label tags)
   ════════════════════════════════════════════════════════════════════════════ */

const PILLARS = [
  {
    id: "oop-encap", label: "OOP-ENCAP", num: "01", title: "Encapsulation",
    tagline: "Bundle & hide state — controlled public interface",
    definition: "Bundling data and the methods that operate on it into a single unit, while restricting direct access to internal state. External code interacts only through a controlled public interface.",
    mechanism: ["_private convention", "@property getters/setters", "__slots__", "MappingProxyType", "Defensive copying"],
    crossRefs: ["DEC-1", "DEC-1.3", "OBJ-1", "OBJ-2", "CAT-5", "CAT-1", "CAT-2"],
    testTemplates: ["ADV-2", "B.1.4"],
    defaultApproach: "@property for non-trivial fields; plain attributes otherwise",
    keyRule: "Tell, Don't Ask — mutate via method, never read-then-decide outside",
    tradeOffs: {
      headers: ["Approach", "Benefit", "Cost", "Use When"],
      rows: [
        ["@property getter only (DEC-1.1)", "Clean API, read-only access", "Method call overhead vs direct attribute", "Default for any non-trivial field"],
        ["@property + validated setter (DEC-1.3)", "Invariant enforcement at boundary", "Setter logic adds complexity; masks expensive ops behind assignment", "Field has business constraints (price ≥ 0, email format)"],
        ["__slots__ (OBJ-1)", "Memory efficiency, prevents typo attributes", "No __dict__, breaks some metaprogramming, complicates MI", "High-volume instances (millions of Seat objects, cache entries)"],
        ["Defensive copy (OBJ-2)", "Prevents alias mutation", "CPU + memory cost of copying", "Mutable collections crossing trust boundaries"],
        ["MappingProxyType", "Zero-copy read-only view", "Only works for dicts; nested mutables still exposed", "Config objects that should never change after init"],
      ]
    },
    examples: [
      { id: "encap-ex1", title: "TicketPrice — Immutable value object", refs: ["OBJ-1", "DEC-1"],
        code: `class TicketPrice:
    __slots__ = ('_amount', '_currency')  # [OBJ-1] Fixed layout

    def __init__(self, price: int, currency: str):
        self._amount = price       # Convention-private
        self._currency = currency

    @property
    def price(self) -> int:        # [DEC-1.1] Controlled read
        return self._amount

    @property
    def currency(self) -> str:     # [DEC-1.1] Controlled read
        return self._currency` },
      { id: "encap-ex2", title: "VenueConfig — Defensive copying", refs: ["OBJ-2"],
        code: `class VenueConfig:
    def __init__(self, settings: dict = None):
        self._settings = dict(settings) if settings else {}  # [OBJ-2] Copy on intake

    def get(self, key: str, default=None):
        return self._settings.get(key, default)

    def set(self, key: str, value) -> None:
        self._settings[key] = value

    def get_all(self) -> dict:
        return dict(self._settings)  # [OBJ-2] Defensive copy on output` },
      { id: "encap-ex3", title: "ImmutableConfig — Read-only enforcement", refs: ["OBJ-2"],
        code: `from types import MappingProxyType

class ImmutableConfig:
    def __init__(self, settings: dict):
        self._settings = MappingProxyType(dict(settings))

    @property
    def settings(self) -> MappingProxyType:
        """Read-only view — mutations raise TypeError."""
        return self._settings` }
    ],
    antiPatterns: [
      { id: "ENCAP-AP1", name: "Public mutable internal", symptom: "Callers freely mutate internal state",
        drift: "No encapsulation boundary — OBJ-2 violation. Internal state exposed without defensive copy.",
        labels: ["OBJ-2"],
        bad: `class Bad:\n    def __init__(self, data):\n        self.data = data  # Public — caller mutates freely`,
        fix: `class Good:\n    def __init__(self, data):\n        self._data = dict(data)  # [OBJ-2] Defensive copy + private` },
      { id: "ENCAP-AP2", name: "Mutable default argument", symptom: "All instances share the same dict/list",
        drift: "Python gotcha — mutable default is created once at def time, shared across all calls.",
        labels: ["OBJ-2"],
        bad: `class Config:\n    def __init__(self, settings: dict = {}):\n        self.settings = settings  # Shared across ALL instances`,
        fix: `class Config:\n    def __init__(self, settings: dict = None):\n        self._settings = dict(settings) if settings else {}` },
      { id: "ENCAP-AP3", name: "Getter/setter with no logic", symptom: "Java ceremony — adds nothing in Python",
        drift: "DEC-1 @property is only justified when it adds validation (DEC-1.3), computation (DEC-1.2), or encapsulation.",
        labels: ["DEC-1", "DEC-1.3"],
        bad: `class OverEngineered:\n    def __init__(self):\n        self._x = 0\n    def get_x(self):\n        return self._x\n    def set_x(self, v):\n        self._x = v`,
        fix: `class Simple:\n    def __init__(self):\n        self.x = 0  # Direct — no logic needed\n\n# OR with validation (DEC-1.3 justified):\nclass Validated:\n    @property\n    def x(self) -> int:\n        return self._x\n    @x.setter\n    def x(self, value: int) -> None:\n        if value < 0:\n            raise ValueError("x must be non-negative")\n        self._x = value` },
      { id: "ENCAP-AP4", name: "Leaking internal collection", symptom: "Caller can mutate internal state via returned reference",
        drift: "Read method returns a live reference instead of a copy — OBJ-2 violation.",
        labels: ["OBJ-2"],
        bad: `class BadPlaylist:\n    def get_songs(self) -> list:\n        return self._songs  # Caller: get_songs().append("Malicious")`,
        fix: `class Playlist:\n    def get_songs(self) -> tuple:\n        return tuple(self._songs)  # Immutable snapshot — [OBJ-2]` }
    ]
  },
  {
    id: "oop-abstr", label: "OOP-ABSTR", num: "02", title: "Abstraction",
    tagline: "Expose what, hide how — ABCs, Protocols, facades",
    definition: "Exposing only essential behaviour while hiding implementation complexity. Callers depend on 'what' an object does, not 'how' it does it.",
    mechanism: ["abc.ABC + @abstractmethod", "typing.Protocol (structural)", "Facade classes", "Interface segregation"],
    crossRefs: ["B.2.1", "PRT-1", "PRT-2", "PRT-3", "PRT-4", "PRT-5", "PAT-4", "DEC-5"],
    testTemplates: ["B.2.1", "B.2.4"],
    defaultApproach: "Protocol at boundaries; ABC only with shared implementation",
    keyRule: "IO boundary → always Protocol, even with one impl. YAGNI does not override testability.",
    tradeOffs: {
      headers: ["Approach", "Benefit", "Cost", "Use When"],
      rows: [
        ["Protocol (PRT-1–PRT-3)", "Structural typing — no forced inheritance", "No shared impl; runtime isinstance needs runtime_checkable", "Public API boundaries, DI"],
        ["ABC (B.2.1)", "Enforced contract; mixed abstract + concrete", "Forces inheritance coupling; rigid hierarchy", "Shared implementation across related types"],
        ["Facade (PAT-4)", "Simplifies complex subsystems; reduces coupling surface", "Adds indirection; can become god class", "Orchestrating 3+ subsystems behind single entry"],
        ["Duck typing (no annotation)", "Maximum flexibility; zero ceremony", "No static checking; errors at runtime", "Internal wiring between tightly-coupled modules"],
      ]
    },
    examples: [
      { id: "abstr-ex1", title: "Protocol as abstraction boundary", refs: ["PRT-2", "POLY-2"],
        code: `from typing import Protocol\n\nclass PaymentGateway(Protocol):\n    """Callers see ONLY this interface — implementation hidden.\n    [PRT-2] IO boundary → always Protocol.\n    """\n    def charge(self, amount: int) -> str: ...\n    def refund(self, tx_id: str) -> bool: ...` },
      { id: "abstr-ex2", title: "ABC with template method", refs: ["B.2.1", "PAT-9", "DEC-5"],
        code: `from abc import ABC, abstractmethod\n\nclass BaseProcessor(ABC):\n    """Skeleton algorithm — subclasses fill in the steps. [PAT-9]"""\n\n    def process(self, data: dict) -> dict:\n        validated = self.validate(data)\n        return self.transform(validated)\n\n    @abstractmethod                       # [DEC-5]\n    def validate(self, data: dict) -> dict: ...\n\n    @abstractmethod\n    def transform(self, data: dict) -> dict: ...` },
      { id: "abstr-ex3", title: "Boundary decision tree", refs: ["PRT-2"],
        code: `# Which abstraction tool?\n# ─────────────────────────\n# IO boundary (DB, API, queue)  → Protocol [PRT-2]\n# Shared impl + enforced contract → ABC [B.2.1]\n# Pure domain, no second impl    → Concrete class (YAGNI)\n# Hide subsystem complexity      → Facade [PAT-4]` },
      { id: "abstr-ex4", title: "BookingFacade — hiding subsystem complexity", refs: ["PAT-4"],
        code: `class BookingFacade:\n    """Single entry point — hides inventory, payment, notification. [PAT-4]"""\n\n    def __init__(self, inventory, payment, notifier):\n        self._inventory = inventory\n        self._payment = payment\n        self._notifier = notifier\n\n    def book(self, customer_id: str, event_id: str, seats: int) -> str:\n        held = self._inventory.hold_seats(event_id, seats)\n        tx = self._payment.charge(customer_id, held.total_price)\n        self._notifier.send_confirmation(customer_id, tx.id)\n        return tx.id` }
    ],
    antiPatterns: [
      { id: "ABSTR-AP1", name: "Leaky abstraction", symptom: "Callers must know internal storage format",
        drift: "Abstraction exposes implementation details — defeats the purpose of PRT-2.",
        labels: ["PRT-2"],
        bad: `class BadRepository:\n    def get_raw_cursor(self):  # Exposes Postgres-specific cursor\n        return self._db.cursor()`,
        fix: `class BookingRepository(Protocol):  # [PRT-2]\n    def get(self, booking_id: str) -> dict | None: ...\n    def save(self, booking: dict) -> None: ...` },
      { id: "ABSTR-AP2", name: "Fat interface", symptom: "Clients depend on methods they don't use",
        drift: "Single Protocol/ABC bundles unrelated operations — violates Interface Segregation.",
        labels: ["PRT-2", "DEC-5"],
        bad: `class BadWorker(ABC):\n    @abstractmethod\n    def process(self, data): ...\n    @abstractmethod\n    def render_html(self, data): ...   # Unrelated!\n    @abstractmethod\n    def send_email(self, to, body): ... # Unrelated!`,
        fix: `class Processor(Protocol):\n    def process(self, data) -> dict: ...\n\nclass Renderer(Protocol):\n    def render_html(self, data) -> str: ...\n\nclass Notifier(Protocol):\n    def send_email(self, to: str, body: str) -> None: ...` },
      { id: "ABSTR-AP3", name: "ABC with no abstract methods", symptom: "Pretends to enforce contract but enforces nothing",
        drift: "ABC without DEC-5 @abstractmethod — subclasses can be instantiated incomplete.",
        labels: ["DEC-5", "B.2.1"],
        bad: `class FakeAbstract(ABC):\n    def process(self, data):  # Not marked @abstractmethod!\n        return data`,
        fix: `class RealAbstract(ABC):\n    @abstractmethod           # [DEC-5] Now enforced\n    def process(self, data) -> dict: ...` },
      { id: "ABSTR-AP4", name: "Over-abstraction (YAGNI)", symptom: "Unnecessary indirection before second implementation exists",
        drift: "Protocol/ABC introduced prematurely — no second impl, not at IO boundary.",
        labels: ["PRT-2"],
        bad: `# Only ONE payment processor exists:\nclass PaymentProcessorInterface(ABC):\n    @abstractmethod\n    def charge(self, amount): ...\n\nclass StripeProcessor(PaymentProcessorInterface):\n    def charge(self, amount):\n        stripe.charge(amount)`,
        fix: `# Use concrete class directly.\n# Extract Protocol ONLY when second impl\n# materialises or you need test doubles\n# at an IO boundary [PRT-2].\nclass StripePayment:\n    def charge(self, amount):\n        stripe.charge(amount)` }
    ]
  },
  {
    id: "oop-inher", label: "OOP-INHER", num: "03", title: "Inheritance",
    tagline: "Hierarchical reuse — composition by default",
    definition: "Deriving a new class from an existing one, inheriting its interface and (optionally) its implementation. Enables hierarchical code reuse and specialisation.",
    mechanism: ["Class inheritance", "super() + MRO (C3)", "ABCs", "Mixins", "__init_subclass__"],
    crossRefs: ["POLY-1", "B.2.1", "B.2.2", "B.2.3", "ADV-MIXIN-1"],
    testTemplates: ["B.2.2", "B.2.3"],
    defaultApproach: "Composition by default; inherit only for true 'is-a'",
    keyRule: "POLY-1: Max 1 concrete base. Multiple inheritance = concrete + mixins/ABCs only.",
    tradeOffs: {
      headers: ["Approach", "Benefit", "Cost", "Use When"],
      rows: [
        ["Single concrete inheritance", "Straightforward is-a reuse", "Tight coupling; fragile base class", "True taxonomic relationship"],
        ["Mixin inheritance (ADV-MIXIN-1)", "Cross-cutting reuse without deep hierarchies", "MRO complexity; implicit deps", "Behaviour shared by 3+ unrelated classes"],
        ["ABC + Template Method (PAT-9)", "Enforced contract + shared algorithm skeleton", "Subclass explosion if variations small", "Algorithm has fixed structure with varying steps"],
        ["Composition (default)", "Loose coupling; swap at runtime; easier to test", "More boilerplate (delegation)", "Default. Prefer unless inheritance clearly wins"],
      ]
    },
    examples: [
      { id: "inher-ex1", title: "POLY-1 — Inheritance policy", refs: ["POLY-1", "ADV-MIXIN-1"],
        code: `# ✓ CORRECT: Single concrete + mixins\nclass AuditedUser(AuditMixin, TimestampMixin, Ticket):  # [POLY-1]\n    pass\n\n# ✓ CORRECT: ABC + concrete\nclass PostgresBookingRepository(BookingRepository):  # ABC\n    pass\n\n# ✗ WRONG: Multiple concrete bases\nclass HybridBookingStore(FileStore, DatabaseStore):  # [POLY-1] violation!\n    pass` },
      { id: "inher-ex2", title: "Composition over inheritance decision", refs: ["POLY-1"],
        code: `# Is it a true "is-a" relationship?\n# ├─► YES → Does parent have shared impl you need?\n# │         ├─► YES → Single concrete inheritance or ABC\n# │         └─► NO  → Protocol [PRT-2] instead\n# └─► NO  → Composition. Always.\n\nclass HybridStore:  # FIX: Composition\n    def __init__(self, file_store: FileStore, db: DatabaseStore):\n        self._file = file_store\n        self._db = db` },
      { id: "inher-ex3", title: "ABC with template method", refs: ["B.2.1", "PAT-9", "DEC-5"],
        code: `class BaseProcessor(ABC):\n    """Skeleton algorithm — subclasses fill in steps. [PAT-9]"""\n\n    def process(self, data: dict) -> dict:\n        validated = self.validate(data)\n        return self.transform(validated)\n\n    @abstractmethod                       # [DEC-5]\n    def validate(self, data: dict) -> dict: ...\n\n    @abstractmethod\n    def transform(self, data: dict) -> dict: ...` }
    ],
    antiPatterns: [
      { id: "INHER-AP1", name: "Multiple concrete inheritance", symptom: "Diamond problem, ambiguous MRO",
        drift: "POLY-1 violation — max 1 concrete base. Use composition instead.",
        labels: ["POLY-1"],
        bad: `class FileStore:\n    def save(self, key, data):\n        write_to_disk(key, data)\n\nclass DatabaseStore:\n    def save(self, key, data):\n        write_to_db(key, data)\n\nclass HybridStore(FileStore, DatabaseStore):  # Which save()?\n    pass`,
        fix: `class HybridStore:  # Composition — [POLY-1] satisfied\n    def __init__(self, file_store: FileStore, db: DatabaseStore):\n        self._file = file_store\n        self._db = db` },
      { id: "INHER-AP2", name: "Reuse without is-a", symptom: "Inherits methods that break the contract (LSP)",
        drift: "Stack inherits list's sort(), insert(), reverse() — none of which belong on a stack.",
        labels: ["POLY-1"],
        bad: `class Stack(list):  # Inherits sort, insert, reverse\n    def push(self, item):\n        self.append(item)`,
        fix: `class Stack:  # HAS-A list, IS-NOT-A list\n    def __init__(self):\n        self._items: list = []\n\n    def push(self, item) -> None:\n        self._items.append(item)\n\n    def pop(self):\n        if not self._items:\n            raise IndexError("pop from empty stack")\n        return self._items.pop()` },
      { id: "INHER-AP3", name: "Deep hierarchy", symptom: "5+ levels deep or subclass overrides >50% of parent",
        drift: "Fragile base class problem. Every parent change ripples unpredictably.",
        labels: ["POLY-1", "ADV-MIXIN-1"],
        bad: `class Animal: ...           # Level 1\nclass Mammal(Animal): ...   # Level 2\nclass Carnivore(Mammal): ...# Level 3\nclass Canine(Carnivore): ...# Level 4\nclass Dog(Canine): ...      # Level 5\nclass GoldenRetriever(Dog): # Level 6\n    # Overrides most of Dog's methods anyway`,
        fix: `# Flatten with composition + mixins\nclass GoldenRetriever:\n    def __init__(self):\n        self._locomotion = QuadrupedMovement()\n        self._diet = CarnivoreDiet()\n    # Clear, flat, testable` },
      { id: "INHER-AP4", name: "super() chain breakage", symptom: "Mixin calls super().setup() but Base drops the chain",
        drift: "Every class in an MRO must call super() — including the base. Resolves safely to object.",
        labels: ["ADV-MIXIN-1"],
        bad: `class Mixin:\n    def setup(self):\n        super().setup()       # Expects next in MRO\n        self._mixin_ready = True\n\nclass Base:\n    def setup(self):\n        self._base_ready = True  # Does NOT call super()`,
        fix: `class Base:\n    def setup(self):\n        super().setup()       # Safely resolves to object\n        self._base_ready = True` }
    ]
  },
  {
    id: "oop-poly", label: "OOP-POLY", num: "04", title: "Polymorphism",
    tagline: "Same interface, different types — duck typing + Protocol",
    definition: "Objects of different types responding to the same interface. The caller writes one piece of code that works correctly regardless of which concrete type it receives.",
    mechanism: ["Duck typing (implicit)", "Protocol (structural)", "ABC inheritance (nominal)", "@singledispatch", "Operator overloading"],
    crossRefs: ["POLY-2", "PAT-6", "OBJ-1", "B.2.3", "B.2.4", "PRT-1", "PRT-2", "PRT-3"],
    testTemplates: ["B.2.3", "B.2.4"],
    defaultApproach: "Duck typing internally; Protocol at API boundaries",
    keyRule: "POLY-2: Default duck typing + Protocol. Inheritance only for shared implementation.",
    tradeOffs: {
      headers: ["Approach", "Benefit", "Cost", "Use When"],
      rows: [
        ["Duck typing (implicit)", "Zero ceremony; maximum flexibility", "No static checking; runtime errors", "Internal wiring; tightly-coupled modules"],
        ["Protocol (structural)", "No forced inheritance; cross-package; static checking", "No shared impl; runtime_checkable overhead", "Public API boundaries; dependency injection"],
        ["ABC inheritance (nominal)", "Enforced contract; shared implementation", "Rigid hierarchy; forces inheritance", "Shared algorithm skeleton; framework extension"],
        ["@singledispatch", "Clean type-based dispatch; extensible", "Only dispatches on first arg type", "Serialisation; types you don't control"],
        ["Operator overloading", "Value objects behave like built-ins", "Must maintain __hash__/__eq__ contract", "True value objects: TicketPrice, Money"],
      ]
    },
    examples: [
      { id: "poly-ex1", title: "POLY-2 — Polymorphism strategy", refs: ["POLY-2", "PRT-2"],
        code: `# Boundary type?                         [POLY-2]\n# ├─► Public API boundary    → Protocol  [PRT-2]\n# ├─► Internal wiring        → Duck typing (no annotation)\n# ├─► Shared implementation   → ABC      [B.2.1]\n# └─► Never                  → Concrete inheritance for is-a only\n\nclass BookingRepository(Protocol):      # [PRT-2]\n    def get(self, id: str) -> dict | None: ...\n    def save(self, entity: dict) -> None: ...` },
      { id: "poly-ex2", title: "Strategy pattern", refs: ["PAT-6", "PRT-2", "POLY-2"],
        code: `from typing import Protocol\n\nclass PricingStrategy(Protocol):  # [PAT-6] + [PRT-2]\n    def calculate(self, base_price: int) -> int: ...\n\nclass StandardPricing:\n    def calculate(self, base_price: int) -> int:\n        return base_price\n\nclass VipPricing:\n    def calculate(self, base_price: int) -> int:\n        return int(base_price * 1.5)\n\n# New tier = new class, zero existing changes\nclass GroupPricing:\n    def calculate(self, base_price: int) -> int:\n        return int(base_price * 0.7)` },
      { id: "poly-ex3", title: "Value object — operator overloading", refs: ["OBJ-1"],
        code: `from functools import total_ordering\n\n@total_ordering\nclass TicketPrice:\n    __slots__ = ('_amount', '_currency')  # [OBJ-1]\n\n    def __init__(self, price: int, currency: str):\n        self._amount = price\n        self._currency = currency\n\n    def __eq__(self, other):\n        if not isinstance(other, TicketPrice):\n            return False\n        return self._amount == other._amount\n\n    def __lt__(self, other):\n        return self._amount < other._amount\n\n    def __hash__(self):\n        return hash((self._amount, self._currency))` }
    ],
    antiPatterns: [
      { id: "POLY-AP1", name: "isinstance type-switch dispatch", symptom: "Every new type requires editing the switch — violates OCP",
        drift: "POLY-2 says use Protocol conformance, not type checking. isinstance switch breaks Open-Closed.",
        labels: ["POLY-2", "PRT-2"],
        bad: `def process(item):\n    if isinstance(item, Order):\n        handle_order(item)\n    elif isinstance(item, Refund):\n        handle_refund(item)\n    # New type? Edit this function.`,
        fix: `class Processable(Protocol):  # [POLY-2] + [PRT-2]\n    def process(self) -> dict: ...\n\n# Each type conforms — caller uniform:\ndef process(item: Processable):\n    return item.process()` },
      { id: "POLY-AP2", name: "LSP violation — NotImplementedError", symptom: "Subtype refuses base contract",
        drift: "Penguin inherits fly() but can't fly — Liskov Substitution violation.",
        labels: ["POLY-1", "B.2.4"],
        bad: `class Bird(ABC):\n    @abstractmethod\n    def fly(self) -> str: ...\n\nclass Penguin(Bird):\n    def fly(self) -> str:\n        raise NotImplementedError  # Breaks substitutability`,
        fix: `class Bird(ABC):\n    @abstractmethod\n    def move(self) -> str: ...  # Broader contract\n\nclass Sparrow(Bird):\n    def move(self) -> str: return "flying"\n\nclass Penguin(Bird):\n    def move(self) -> str: return "swimming"` },
      { id: "POLY-AP3", name: "Inconsistent return types", symptom: "Caller can't rely on return type across implementations",
        drift: "Protocol contract says dict but XmlParser returns str — POLY-2 conformance broken.",
        labels: ["POLY-2", "PRT-2"],
        bad: `class JsonParser:\n    def parse(self, data: str) -> dict:\n        return json.loads(data)\n\nclass XmlParser:\n    def parse(self, data: str) -> str:  # Wrong type!\n        return ET.tostring(ET.fromstring(data))`,
        fix: `class Parser(Protocol):  # [PRT-2] — contract: always dict\n    def parse(self, data: str) -> dict: ...` },
      { id: "POLY-AP4", name: "Breaking __hash__/__eq__ contract", symptom: "Equal objects hash differently — set/dict silently fail",
        drift: "Overriding __eq__ without __hash__ makes object unhashable. OBJ-1 value objects must pair both.",
        labels: ["OBJ-1"],
        bad: `class BadPrice:\n    def __eq__(self, other):\n        return self.amount == other.amount\n    # __hash__ not defined → defaults to id()\n    # set({BadPrice(100), BadPrice(100)}) → len == 2!`,
        fix: `class Price:\n    def __eq__(self, other):\n        if not isinstance(other, Price): return False\n        return self.amount == other.amount\n\n    def __hash__(self):  # [OBJ-1] Always pair with __eq__\n        return hash((self.amount, self.currency))` }
    ]
  }
];

const QUICK_REF = {
  title: "OOP Pillar Quick-Reference Matrix",
  headers: ["Pillar", "Primary Labels", "Test Templates", "Key Anti-Patterns", "Default Approach"],
  rows: [
    ["Encapsulation", "DEC-1, OBJ-1, OBJ-2", "ADV-2, B.1.4", "Public mutables, mutable defaults, no-op getters, leaked references", "@property for non-trivial; plain attrs otherwise"],
    ["Abstraction", "PRT-1–PRT-5, B.2.1, PAT-4", "B.2.1, B.2.4", "Leaky abstractions, fat interfaces, fake ABCs, premature abstraction", "Protocol at boundaries; ABC with shared impl"],
    ["Inheritance", "POLY-1, ADV-MIXIN-1", "B.2.2, B.2.3", "Multiple concrete bases, deep hierarchies, reuse-without-is-a, broken super()", "Composition by default; inherit for true is-a"],
    ["Polymorphism", "POLY-2, PAT-6, OBJ-1", "B.2.3, B.2.4", "Type-switch dispatch, LSP violations, inconsistent returns, hash/eq mismatch", "Duck typing internally; Protocol at boundaries"]
  ]
};

const SOLID_MAP = {
  title: "SOLID ↔ OOP Pillars Cross-Map",
  headers: ["SOLID Principle", "Enforces Correct Use Of", "Prevents Misuse Of"],
  rows: [
    ["SRP", "Encapsulation — focuses what gets bundled", "Encapsulation bloat (god classes)"],
    ["OCP", "Polymorphism + Abstraction", "Modification-heavy polymorphism (type switches)"],
    ["LSP", "Inheritance + Polymorphism", "Broken inheritance hierarchies"],
    ["ISP", "Abstraction — minimal interfaces", "Fat abstractions coupling unrelated consumers"],
    ["DIP", "Abstraction + Polymorphism", "Concrete coupling defeating abstraction"]
  ]
};


/* ════════════════════════════════════════════════════════════════════════════
   DECISION TREE DIAGRAMS (unchanged from original)
   ════════════════════════════════════════════════════════════════════════════ */

/*
  DT-OOP-1 — Single comprehensive SVG
  
  Replace the entire DT / DecisionTree section in App.jsx with this.
  No tabs, no panels — one scrollable diagram showing all 4 branches.
  
  Usage:  <DecisionTree scrollTo={scrollTo} />
*/

function Bx({x,y,w,h,fill,stroke,rx,children,onClick,cls=""}){return<g className={`dn ${cls}`} onClick={onClick} style={onClick?{cursor:"pointer"}:{}}><rect x={x} y={y} width={w} height={h} rx={rx||6} fill={fill||"var(--bg-2)"} stroke={stroke||"var(--border-light)"} strokeWidth="0.7"/>{children}</g>;}
function Ar({x1,y1,x2,y2,d}){return<line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--text-3)" strokeWidth="0.8" markerEnd="url(#da)" strokeDasharray={d?"4 3":"none"}/>;} 
function Lb({x,y,children,a="middle",s=10,c="var(--text-2)",w=400}){return<text x={x} y={y} textAnchor={a} dominantBaseline="central" fill={c} fontSize={s} fontFamily="'IBM Plex Mono',monospace" fontWeight={w}>{children}</text>;}

function DecisionTree({scrollTo}) {
  // Column centers
  const C1=85, C2=255, C3=425, C4=595;
  const CW=150; // column width
  
  // Colors
  const enc={c:"var(--accent-2)",bg:"rgba(133,205,202,0.10)",b:"rgba(133,205,202,0.25)"};
  const abs={c:"var(--accent-4)",bg:"rgba(121,184,255,0.10)",b:"rgba(121,184,255,0.25)"};
  const inh={c:"var(--accent-1)",bg:"rgba(232,168,124,0.10)",b:"rgba(232,168,124,0.25)"};
  const pol={c:"var(--yellow)",bg:"rgba(252,211,77,0.10)",b:"rgba(252,211,77,0.25)"};
  const red={bg:"rgba(248,113,113,0.05)",b:"rgba(248,113,113,0.2)"};
  const grn={bg:"rgba(110,231,183,0.08)",b:"rgba(110,231,183,0.2)"};

  return <div className="dt" id="dt-oop-1">
    <div className="dt-hd">
      <span className="dt-tg">DT-OOP-1</span>
      <span className="dt-ti">Four Pillars Decision Tree</span>
    </div>
    <div className="dt-cv" style={{overflowY:"auto",maxHeight:"70vh"}}>
      <svg width="100%" viewBox="0 0 680 920" style={{display:"block",minWidth:600}}>
        <defs>
          <marker id="da" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M2 1.5L8 5L2 8.5" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </marker>
        </defs>

        {/* ═══ ROW 1: START ═══ */}
        <Bx x={220} y={12} w={240} h={32} rx={16} fill="var(--bg-3)">
          <Lb x={340} y={28} s={11} c="var(--text-1)" w={500}>New class or method to write</Lb>
        </Bx>
        <Ar x1={340} y1={44} x2={340} y2={64}/>

        {/* ═══ ROW 2: WHICH PILLAR? ═══ */}
        <Bx x={170} y={64} w={340} h={40} fill="rgba(196,155,222,0.08)" stroke="rgba(196,155,222,0.25)" rx={8}>
          <Lb x={340} y={78} s={11} c="var(--accent-3)" w={600}>Which OOP pillar? — DT-OOP-1</Lb>
          <Lb x={340} y={92} s={9}>Walk each relevant branch. Most designs involve more than one.</Lb>
        </Bx>

        {/* ═══ ROW 3: FOUR PILLAR HEADERS ═══ */}
        {[
          {cx:C1,l:"Encapsulation",...enc,id:"oop-encap"},
          {cx:C2,l:"Abstraction",...abs,id:"oop-abstr"},
          {cx:C3,l:"Inheritance",...inh,id:"oop-inher"},
          {cx:C4,l:"Polymorphism",...pol,id:"oop-poly"},
        ].map((p,i)=><g key={p.l}>
          <Ar x1={220+i*80} y1={104} x2={p.cx} y2={128}/>
          <Bx x={p.cx-CW/2} y={128} w={CW} h={32} fill={p.bg} stroke={p.b} rx={6} 
            onClick={scrollTo?()=>scrollTo(p.id):undefined} cls={scrollTo?"dc":""}>
            <Lb x={p.cx} y={144} s={11} c={p.c} w={600}>{p.l}</Lb>
          </Bx>
          <Ar x1={p.cx} y1={160} x2={p.cx} y2={180}/>
        </g>)}

        {/* ═══ ROW 4: DECISION GATES ═══ */}
        {/* Encapsulation gate */}
        <Bx x={C1-68} y={180} w={136} h={28} fill={enc.bg} stroke={enc.b} rx={4}>
          <Lb x={C1} y={194} s={10} c={enc.c} w={500}>State exposed?</Lb>
        </Bx>
        {/* Abstraction gate */}
        <Bx x={C2-68} y={180} w={136} h={28} fill={abs.bg} stroke={abs.b} rx={4}>
          <Lb x={C2} y={194} s={10} c={abs.c} w={500}>Boundary type?</Lb>
        </Bx>
        {/* Inheritance gate */}
        <Bx x={C3-68} y={180} w={136} h={28} fill={inh.bg} stroke={inh.b} rx={4}>
          <Lb x={C3} y={194} s={10} c={inh.c} w={500}>True is-a?</Lb>
        </Bx>
        {/* Polymorphism gate */}
        <Bx x={C4-68} y={180} w={136} h={28} fill={pol.bg} stroke={pol.b} rx={4}>
          <Lb x={C4} y={194} s={10} c={pol.c} w={500}>Which mechanism?</Lb>
        </Bx>

        {/* ═══ ROW 5: OUTCOMES ═══ */}
        {/* ─── Encapsulation outcomes ─── */}
        <Ar x1={C1} y1={208} x2={C1} y2={232}/>
        <Bx x={C1-72} y={232} w={144} h={120} fill={enc.bg} stroke={enc.b} rx={6}>
          <Lb x={C1} y={248} s={10} c={enc.c} w={600}>Fix: ENCAP-1</Lb>
          <Lb x={C1} y={266} s={9}>_private convention</Lb>
          <Lb x={C1} y={280} s={9}>@property — DEC-1</Lb>
          <Lb x={C1} y={294} s={9}>__slots__ — OBJ-1</Lb>
          <Lb x={C1} y={308} s={9}>Defensive copy — OBJ-2</Lb>
          <Lb x={C1} y={324} s={9}>MappingProxyType</Lb>
          <Lb x={C1} y={340} s={9} c="var(--accent-1)">Tell, don't ask</Lb>
        </Bx>

        {/* ─── Abstraction outcomes ─── */}
        <Ar x1={C2} y1={208} x2={C2} y2={232}/>
        <Bx x={C2-72} y={232} w={144} h={120} fill={abs.bg} stroke={abs.b} rx={6}>
          <Lb x={C2} y={248} s={10} c={abs.c} w={600}>Choose tool</Lb>
          <Lb x={C2} y={268} s={9} c={abs.c}>IO boundary → Protocol</Lb>
          <Lb x={C2} y={282} s={9}>PRT-2, always, even 1 impl</Lb>
          <Lb x={C2} y={300} s={9} c={abs.c}>Shared impl → ABC</Lb>
          <Lb x={C2} y={314} s={9}>DEC-5, B.2.1</Lb>
          <Lb x={C2} y={332} s={9} c="var(--yellow)">No 2nd impl → YAGNI</Lb>
          <Lb x={C2} y={346} s={9} c={abs.c}>Complex → Facade PAT-4</Lb>
        </Bx>

        {/* ─── Inheritance outcomes ─── */}
        <Ar x1={C3-30} y1={208} x2={C3-40} y2={232}/>
        <Lb x={C3-42} y={218} s={8} c="var(--red)">No</Lb>
        <Ar x1={C3+30} y1={208} x2={C3+40} y2={232}/>
        <Lb x={C3+44} y={218} s={8} c="var(--green)">Yes</Lb>
        {/* No → Composition */}
        <Bx x={C3-72} y={232} w={64} h={50} fill={red.bg} stroke={red.b} rx={4}>
          <Lb x={C3-40} y={250} s={9} c="var(--red)" w={500}>Use</Lb>
          <Lb x={C3-40} y={264} s={9} c="var(--red)" w={500}>compo-</Lb>
          <Lb x={C3-40} y={278} s={9} c="var(--red)" w={500}>sition</Lb>
        </Bx>
        {/* Yes → POLY-1 + super check */}
        <Bx x={C3+4} y={232} w={68} h={120} fill={inh.bg} stroke={inh.b} rx={4}>
          <Lb x={C3+38} y={248} s={9} c={inh.c} w={600}>POLY-1</Lb>
          <Lb x={C3+38} y={264} s={8}>Max 1</Lb>
          <Lb x={C3+38} y={276} s={8}>concrete</Lb>
          <Lb x={C3+38} y={290} s={8}>base</Lb>
          <Lb x={C3+38} y={310} s={9} c={inh.c} w={500}>super()?</Lb>
          <Lb x={C3+38} y={326} s={8}>Every class</Lb>
          <Lb x={C3+38} y={338} s={8}>must call it</Lb>
        </Bx>

        {/* ─── Polymorphism outcomes ─── */}
        <Ar x1={C4} y1={208} x2={C4} y2={232}/>
        <Bx x={C4-72} y={232} w={144} h={120} fill={pol.bg} stroke={pol.b} rx={6}>
          <Lb x={C4} y={248} s={10} c={pol.c} w={600}>POLY-2 decide</Lb>
          <Lb x={C4} y={268} s={9}>Strategy — PAT-6</Lb>
          <Lb x={C4} y={282} s={9}>Repository — PRT-2</Lb>
          <Lb x={C4} y={296} s={9}>Template — PAT-9</Lb>
          <Lb x={C4} y={310} s={9}>Operators — OBJ-1</Lb>
          <Lb x={C4} y={328} s={9} c="var(--red)">isinstance switch?</Lb>
          <Lb x={C4} y={342} s={9} c="var(--red)">→ Redesign to Protocol</Lb>
        </Bx>

        {/* ═══ ROW 6: ANTI-PATTERN AUDITS ═══ */}
        {[
          {cx:C1, items:["Public mutable?","Mutable default?","No-op getter?","Leaked collection?"], ...enc},
          {cx:C2, items:["Leaky abstraction?","Fat interface?","ABC no abstract?","YAGNI violation?"], ...abs},
          {cx:C3, items:["Diamond problem?","5+ levels deep?","Override >50%?","Broken super()?"], ...inh},
          {cx:C4, items:["isinstance switch?","NotImplementedError?","Inconsistent returns?","hash/eq broken?"], ...pol},
        ].map(col=><g key={col.cx}>
          <Ar x1={col.cx} y1={352} x2={col.cx} y2={380}/>
          <Bx x={col.cx-72} y={380} w={144} h={90} fill={red.bg} stroke={red.b} rx={4}>
            <Lb x={col.cx} y={396} s={9} c="var(--red)" w={500}>Anti-pattern audit</Lb>
            {col.items.map((item,j)=><Lb key={j} x={col.cx} y={412+j*14} s={8}>{item}</Lb>)}
          </Bx>
          <Ar x1={col.cx} y1={470} x2={col.cx} y2={498}/>
        </g>)}

        {/* Encap composition box also needs arrow down */}
        <line x1={C3-40} y1={282} x2={C3-40} y2={498} stroke="var(--text-3)" strokeWidth="0.5" strokeDasharray="3 2"/>

        {/* ═══ ROW 7: CONVERGE ═══ */}
        <Bx x={120} y={498} w={440} h={36} fill="rgba(196,155,222,0.07)" stroke="rgba(196,155,222,0.25)" rx={8}>
          <Lb x={340} y={516} s={11} c="var(--accent-3)" w={500}>More pillars to apply?</Lb>
        </Bx>

        {/* Loop arrow */}
        <path d="M120 516 L60 516 L60 84 L170 84" fill="none" stroke="var(--text-3)" strokeWidth="0.8" strokeDasharray="4 3" markerEnd="url(#da)"/>
        <Lb x={52} y={504} s={8} c="var(--text-3)" a="end">Yes</Lb>

        {/* Done arrow */}
        <Ar x1={560} y1={516} x2={600} y2={550}/>
        <Lb x={586} y={530} s={8} c="var(--text-3)">No</Lb>

        {/* ═══ ROW 8: DONE ═══ */}
        <Bx x={500} y={544} w={170} h={56} rx={10} fill={grn.bg} stroke={grn.b}>
          <Lb x={585} y={558} s={10} c="var(--green)" w={500}>All pillars applied</Lb>
          <Lb x={585} y={574} s={9}>State hidden ✓</Lb>
          <Lb x={585} y={588} s={9}>Boundaries typed ✓</Lb>
        </Bx>

        {/* ═══ FOOTER: SOLID cross-ref ═══ */}
        <Ar x1={585} y1={600} x2={585} y2={624}/>
        <Bx x={480} y={624} w={210} h={28} rx={14} fill="rgba(196,155,222,0.06)" stroke="rgba(196,155,222,0.2)">
          <Lb x={585} y={638} s={9} c="var(--accent-3)">Next → apply SOLID (Diagram 02)</Lb>
        </Bx>
      </svg>
    </div>
  </div>;
}

/* ════════════════════════════════════════════════════════════════════════════
   QUICK REFERENCE TABLE
   ════════════════════════════════════════════════════════════════════════════ */

function QRTable({data}) {
  const [open, setOpen] = useState(false);
  return <div className="coll qr" id={data.title.includes("SOLID")?"solid-crossmap":"quick-ref"}>
    <button className="coll-btn" onClick={()=>setOpen(!open)}><span>{open?"▾":"▸"}</span><span>{data.title}</span></button>
    {open && <div className="coll-body"><div className="tbl-wrap"><table>
      <thead><tr>{data.headers.map(h=><th key={h}>{h}</th>)}</tr></thead>
      <tbody>{data.rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody>
    </table></div></div>}
  </div>;
}


/* ════════════════════════════════════════════════════════════════════════════
   SEARCH
   ════════════════════════════════════════════════════════════════════════════ */

function SearchBar({query, setQuery}) {
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if ((e.metaKey||e.ctrlKey)&&e.key==="k") { e.preventDefault(); ref.current?.focus(); } if (e.key==="Escape") { setQuery(""); ref.current?.blur(); } };
    window.addEventListener("keydown",h); return ()=>window.removeEventListener("keydown",h);
  }, [setQuery]);
  return <div className="search-bar">
    <span className="search-icon">⌕</span>
    <input ref={ref} type="text" placeholder="Search labels, patterns, code…" value={query} onChange={e=>setQuery(e.target.value)}/>
    {query ? <button className="search-clear" onClick={()=>setQuery("")}>✕</button> : <kbd className="search-kbd">⌘K</kbd>}
  </div>;
}

function useSearch(q) {
  return useMemo(() => {
    if (!q||q.length<2) return null;
    const ql=q.toLowerCase(), res=[];
    PILLARS.forEach(p => {
      if ([p.label,p.title,p.tagline,p.definition,p.keyRule].some(s=>s.toLowerCase().includes(ql)))
        res.push({type:"pillar",id:p.id,title:`${p.label} — ${p.title}`});
      p.crossRefs.forEach(r => { if(r.toLowerCase().includes(ql)) res.push({type:"ref",id:p.id,title:`${r} → ${p.label}`}); });
      p.examples.forEach(ex => { if(ex.title.toLowerCase().includes(ql)||ex.code.toLowerCase().includes(ql)) res.push({type:"example",id:p.id,title:ex.title,sub:p.label}); });
      p.antiPatterns.forEach(ap => { if(ap.id.toLowerCase().includes(ql)||ap.name.toLowerCase().includes(ql)) res.push({type:"anti-pattern",id:p.id,title:`⚠ ${ap.id}: ${ap.name}`,sub:p.label}); });
    });
    // Search labels themselves
    Object.entries(LABELS).forEach(([key,val]) => {
      if (key.toLowerCase().includes(ql)||val.name.toLowerCase().includes(ql)||val.def.toLowerCase().includes(ql))
        res.push({type:"label",id:"oop-encap",title:`${key} — ${val.name}`,sub:val.def.slice(0,60)});
    });
    const seen=new Set(); return res.filter(r=>{if(seen.has(r.title))return false;seen.add(r.title);return true;}).slice(0,12);
  }, [q]);
}


/* ════════════════════════════════════════════════════════════════════════════
   MAIN APP
   ════════════════════════════════════════════════════════════════════════════ */

export default function OOPFundamentals() {
  const [activeId, setActiveId] = useState("oop-encap");
  const [searchQuery, setSearchQuery] = useState("");
  const contentRef = useRef(null);
  const results = useSearch(searchQuery);

  const scrollTo = useCallback((id) => {
    setSearchQuery("");
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(es => { es.forEach(e => { if(e.isIntersecting) setActiveId(e.target.id); }); }, {rootMargin:"-20% 0px -70% 0px"});
    PILLARS.forEach(p => { const el=document.getElementById(p.id); if(el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  return (
    <div className="app-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        .app-root{--bg-0:#0c0e12;--bg-1:#12151b;--bg-2:#1a1e27;--bg-3:#232833;--bg-4:#2c3240;--border:#2a2f3b;--border-light:#353b4a;--text-0:#e8ecf4;--text-1:#b4bcd0;--text-2:#7e879c;--text-3:#545c6e;--accent-1:#e8a87c;--accent-2:#85cdca;--accent-3:#c49bde;--accent-4:#79b8ff;--red:#f87171;--green:#6ee7b7;--yellow:#fcd34d;--orange:#fb923c;display:flex;height:100vh;background:var(--bg-0);color:var(--text-0);font-family:'Outfit',sans-serif;font-size:14px;line-height:1.6;overflow:hidden}

        /* Sidebar */
        .sidebar{width:280px;min-width:280px;background:var(--bg-1);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}
        .sb-header{padding:20px 20px 0}
        .sb-title{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--text-2);margin-bottom:4px}
        .sb-heading{font-size:18px;font-weight:600;color:var(--text-0);margin-bottom:16px;line-height:1.3}
        .sb-nav{flex:1;overflow-y:auto;padding:8px 12px}
        .sb-nav::-webkit-scrollbar{width:4px}.sb-nav::-webkit-scrollbar-thumb{background:var(--bg-4);border-radius:2px}
        .nav-item{display:flex;align-items:flex-start;gap:12px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all .15s;border:1px solid transparent;margin-bottom:2px}
        .nav-item:hover{background:var(--bg-2);border-color:var(--border)}
        .nav-item.on{background:var(--bg-3);border-color:var(--border-light)}
        .nav-num{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;color:var(--text-3);min-width:20px;padding-top:3px}
        .nav-item.on .nav-num{color:var(--accent-1)}
        .nav-lbl{font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:500;color:var(--accent-2);letter-spacing:.05em}
        .nav-title{font-size:13px;font-weight:500;color:var(--text-1);line-height:1.3}
        .nav-item.on .nav-title{color:var(--text-0)}
        .nav-tag{font-size:11px;color:var(--text-3);margin-top:2px}
        .sb-section{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--text-3);padding:16px 12px 6px}
        .nav-extra{display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:6px;cursor:pointer;font-size:12px;color:var(--text-2);transition:all .15s}
        .nav-extra:hover{background:var(--bg-2);color:var(--text-1)}

        /* Main */
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
        .topbar{padding:12px 32px;border-bottom:1px solid var(--border);background:var(--bg-1);display:flex;align-items:center;gap:16px;position:relative}
        .content{flex:1;overflow-y:auto;padding:32px 40px 80px;scroll-behavior:smooth}
        .content::-webkit-scrollbar{width:6px}.content::-webkit-scrollbar-thumb{background:var(--bg-4);border-radius:3px}

        /* Search */
        .search-bar{display:flex;align-items:center;gap:8px;background:var(--bg-2);border:1px solid var(--border);border-radius:8px;padding:6px 12px;flex:1;max-width:480px;transition:border-color .15s}
        .search-bar:focus-within{border-color:var(--accent-2)}
        .search-icon{color:var(--text-3);font-size:15px}
        .search-bar input{background:none;border:none;outline:none;color:var(--text-0);font-family:'IBM Plex Mono',monospace;font-size:13px;flex:1;width:100%}
        .search-bar input::placeholder{color:var(--text-3)}
        .search-clear{background:none;border:none;color:var(--text-3);cursor:pointer;font-size:13px;padding:2px 4px}
        .search-clear:hover{color:var(--text-1)}
        .search-kbd{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--text-3);background:var(--bg-3);padding:2px 6px;border-radius:4px;border:1px solid var(--border)}
        .search-results{position:absolute;top:100%;left:32px;right:32px;max-width:520px;background:var(--bg-2);border:1px solid var(--border-light);border-radius:10px;box-shadow:0 16px 48px rgba(0,0,0,.5);z-index:100;max-height:400px;overflow-y:auto;padding:6px}
        .sr-item{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:6px;cursor:pointer;transition:background .1s}
        .sr-item:hover{background:var(--bg-3)}
        .sr-type{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--bg-0);background:var(--accent-2);padding:2px 6px;border-radius:3px;min-width:50px;text-align:center}
        .sr-type.anti-pattern{background:var(--orange)}.sr-type.example{background:var(--accent-3)}.sr-type.label{background:var(--accent-1)}.sr-type.ref{background:var(--accent-4)}
        .sr-title{font-size:13px;color:var(--text-0);font-family:'IBM Plex Mono',monospace}
        .sr-sub{font-size:11px;color:var(--text-3);margin-left:auto}
        .sr-empty{padding:20px;text-align:center;color:var(--text-3);font-size:13px}

        /* Page header */
        .pg-header{margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid var(--border)}
        .pg-bc{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-3);letter-spacing:.08em;margin-bottom:8px}
        .pg-bc span{color:var(--accent-2)}
        .pg-title{font-size:32px;font-weight:700;color:var(--text-0);line-height:1.2;margin-bottom:6px}
        .pg-sub{font-size:15px;color:var(--text-2);max-width:600px}
        .pg-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:20px}
        .pg-card{padding:12px 14px;background:var(--bg-2);border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:all .2s}
        .pg-card:hover{border-color:var(--accent-2);transform:translateY(-1px)}
        .pc-num{font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:700;color:var(--bg-4)}
        .pc-title{font-size:14px;font-weight:600;color:var(--text-0);margin-top:4px}
        .pc-count{font-size:11px;color:var(--text-3);margin-top:2px}

        /* Label legend */
        .label-legend{margin-bottom:24px;border:1px solid var(--border);border-radius:10px;overflow:hidden}
        .legend-toggle{display:flex;align-items:center;gap:10px;width:100%;padding:12px 16px;background:var(--bg-1);border:none;cursor:pointer;color:var(--text-1);font-family:'Outfit',sans-serif;font-size:14px;font-weight:500;text-align:left}
        .legend-toggle:hover{background:var(--bg-2)}
        .legend-count{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-3);background:var(--bg-3);padding:1px 7px;border-radius:10px}
        .legend-body{padding:6px 16px 16px;background:var(--bg-1);display:flex;flex-direction:column;gap:8px}
        .legend-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .legend-icon{font-size:12px;min-width:14px}
        .legend-fam{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;min-width:80px}
        .legend-scope{font-size:11px;color:var(--text-3);min-width:150px}
        .legend-tags{display:flex;gap:4px;flex-wrap:wrap}
        .legend-xref{font-size:11px;color:var(--text-3);margin-top:8px;padding-top:8px;border-top:1px solid var(--border);display:flex;align-items:center;gap:6px;flex-wrap:wrap}

        /* RefTag */
        .ref-tag{display:inline-flex;align-items:center;gap:3px;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:500;padding:2px 8px;border-radius:4px;border:1px solid;cursor:default;transition:all .15s;white-space:nowrap;position:relative}
        .ref-tag:hover{filter:brightness(1.15)}
        .ref-icon{font-size:7px;opacity:.6}
        .ref-tip{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:var(--bg-2);border:1px solid;border-radius:8px;padding:10px 14px;min-width:240px;max-width:320px;box-shadow:0 8px 32px rgba(0,0,0,.5);z-index:200;pointer-events:none;animation:fadeIn .12s ease;display:flex;flex-direction:column;gap:4px}
        .ref-tip::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:6px solid transparent;border-top-color:var(--bg-2)}
        .ref-tip-head{display:flex;align-items:center;gap:8px}
        .ref-tip-fam{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
        .ref-tip-name{font-size:13px;font-weight:600;color:var(--text-0)}
        .ref-tip-def{font-size:12px;color:var(--text-1);line-height:1.5}

        /* Pillar */
        .pillar{margin-bottom:56px;padding-bottom:48px;border-bottom:1px solid var(--border);animation:fadeIn .3s ease both}
        .pillar:last-of-type{border-bottom:none}
        .p-head{display:flex;align-items:flex-start;gap:20px;margin-bottom:24px}
        .p-num{font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:700;color:var(--bg-4);line-height:1;min-width:48px}
        .p-label{font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;color:var(--accent-2);letter-spacing:.06em;margin-bottom:4px}
        .p-head h2{font-size:28px;font-weight:700;color:var(--text-0);line-height:1.2}
        .p-tag{font-size:14px;color:var(--text-2);margin-top:4px;font-style:italic}
        .p-def{background:var(--bg-2);border-left:3px solid var(--accent-2);padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:16px}
        .p-def p{color:var(--text-1);font-size:14px;line-height:1.7}
        .p-rule{display:flex;align-items:flex-start;gap:10px;padding:12px 16px;background:rgba(232,168,124,.08);border:1px solid rgba(232,168,124,.2);border-radius:8px;margin-bottom:16px;font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--accent-1);line-height:1.5}
        .p-rule-icon{font-weight:700;font-size:15px;flex-shrink:0}
        .mech-row{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;flex-wrap:wrap}
        .row-label{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--text-3);min-width:90px;padding-top:5px;flex-shrink:0}
        .mech-tags{display:flex;flex-wrap:wrap;gap:6px}
        .mech-tag{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--text-1);background:var(--bg-2);border:1px solid var(--border);padding:3px 10px;border-radius:4px}
        .refs-row{display:flex;gap:32px;margin-bottom:12px;flex-wrap:wrap}
        .refs-row>div{display:flex;align-items:flex-start;gap:10px}
        .ref-tags{display:flex;flex-wrap:wrap;gap:4px}
        .p-default{display:flex;align-items:flex-start;gap:12px;margin-bottom:20px;font-size:13px;color:var(--text-1)}

        /* Collapsible */
        .coll{margin-bottom:8px}
        .coll-btn{display:flex;align-items:center;gap:8px;width:100%;padding:10px 14px;background:var(--bg-2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-family:'Outfit',sans-serif;font-size:14px;font-weight:500;color:var(--text-1);transition:all .15s;text-align:left}
        .coll-btn:hover{background:var(--bg-3);border-color:var(--border-light)}
        .ap-btn-head{border-color:rgba(248,113,113,.15);background:rgba(248,113,113,.04)}
        .ap-btn-head:hover{background:rgba(248,113,113,.08)}
        .td-btn{border-color:rgba(133,205,202,.15);background:rgba(133,205,202,.04)}
        .td-btn:hover{background:rgba(133,205,202,.08)}
        .coll-count{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-3);background:var(--bg-3);padding:1px 7px;border-radius:10px;margin-left:auto}
        .coll-count.warn{color:var(--red);background:rgba(248,113,113,.1)}
        .coll-body{padding:12px 0 4px;display:flex;flex-direction:column;gap:12px}

        /* Example */
        .ex-card{border:1px solid var(--border);border-radius:8px;overflow:hidden}
        .ex-head{display:flex;align-items:center;justify-content:space-between;padding:8px 14px;background:var(--bg-2);border-bottom:1px solid var(--border);font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:500;color:var(--text-1);gap:8px;flex-wrap:wrap}
        .ex-refs{display:flex;gap:4px;flex-wrap:wrap}

        /* Code */
        .code-block{position:relative;background:var(--bg-0)}
        .ex-card .code-block{border-radius:0}
        .code-label{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-3);padding:8px 16px 0;letter-spacing:.05em}
        .code-block pre{padding:14px 16px;overflow-x:auto;font-family:'JetBrains Mono',monospace;font-size:12.5px;line-height:1.65;color:var(--text-1)}
        .code-block pre::-webkit-scrollbar{height:4px}.code-block pre::-webkit-scrollbar-thumb{background:var(--bg-4);border-radius:2px}
        .copy-btn{position:absolute;top:8px;right:8px;background:var(--bg-3);border:1px solid var(--border);color:var(--text-3);font-size:14px;padding:3px 7px;border-radius:4px;cursor:pointer;opacity:0;transition:all .15s;z-index:2}
        .code-block:hover .copy-btn{opacity:1}
        .copy-btn:hover{color:var(--text-0);background:var(--bg-4)}
        .hl-kw{color:#c49bde}.hl-str{color:#a5d6a7}.hl-cmt{color:#545c6e;font-style:italic}.hl-bi{color:#79b8ff}.hl-dec{color:#e8a87c}.hl-lbl{color:#85cdca;font-weight:500}

        /* Anti-pattern */
        .ap-card{border:1px solid rgba(248,113,113,.15);border-radius:8px;overflow:hidden;background:rgba(248,113,113,.02)}
        .ap-header{padding:12px 16px 8px}
        .ap-badge{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;color:var(--orange);letter-spacing:.04em;margin-bottom:4px}
        .ap-header h4{font-size:14px;font-weight:600;color:var(--text-0);margin-bottom:2px}
        .ap-symptom{font-size:12px;color:var(--text-2);font-style:italic}
        .ap-drift{font-size:12px;color:var(--accent-1);margin-top:6px;font-family:'IBM Plex Mono',monospace;line-height:1.5}
        .ap-tags{display:flex;gap:4px;margin-top:8px;flex-wrap:wrap}
        .ap-bar{display:flex;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
        .ap-btn{flex:1;padding:6px 12px;background:none;border:none;cursor:pointer;font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--text-3);transition:all .15s}
        .ap-btn:first-child{border-right:1px solid var(--border)}
        .ap-btn.on{background:var(--bg-2)}
        .ap-btn:first-child.on{color:var(--red)}
        .ap-btn:last-child.on{color:var(--green)}
        .ap-btn:hover{background:var(--bg-3)}

        /* DT */
        .dt-diagram{background:var(--bg-1);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:40px}
        .dt-head{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bg-2)}
        .dt-tag{font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;color:var(--accent-3);background:rgba(196,155,222,.1);border:1px solid rgba(196,155,222,.2);padding:2px 8px;border-radius:4px;letter-spacing:.05em}
        .dt-title{font-size:14px;font-weight:600;color:var(--text-0)}
        .dt-tabs{display:flex;gap:2px;padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg-1)}
        .dt-tab{padding:5px 14px;border-radius:6px;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:500;color:var(--text-3);background:transparent;border:1px solid transparent;cursor:pointer;transition:all .15s}
        .dt-tab:hover{color:var(--text-1);background:var(--bg-2)}
        .dt-tab.on{background:var(--bg-3);border-color:var(--border-light)}
        .dt-canvas{padding:16px;min-height:200px}
        .dt-canvas svg{max-width:100%}
        .dia-click{cursor:pointer}.dia-click:hover rect{filter:brightness(1.2)}
        .dia-n text{user-select:none;pointer-events:none}

        /* Tables */
        .tbl-wrap{overflow-x:auto}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3);background:var(--bg-2);padding:10px 12px;text-align:left;border-bottom:1px solid var(--border);white-space:nowrap}
        td{padding:10px 12px;color:var(--text-1);border-bottom:1px solid var(--border);vertical-align:top;line-height:1.5}
        tr:hover td{background:rgba(133,205,202,.03)}
        .td-app{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--accent-2);white-space:nowrap}
        .qr{margin-top:16px}

        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <aside className="sidebar">
        <div className="sb-header">
          <div className="sb-title">Python TDD & OOP Guide</div>
          <div className="sb-heading">OOP Fundamentals</div>
        </div>
        <nav className="sb-nav">
          <div className="sb-section">The Four Pillars</div>
          {PILLARS.map(p => (
            <div key={p.id} className={`nav-item ${activeId===p.id?"on":""}`} onClick={()=>scrollTo(p.id)}>
              <div className="nav-num">{p.num}</div>
              <div>
                <div className="nav-lbl">{p.label}</div>
                <div className="nav-title">{p.title}</div>
                <div className="nav-tag">{p.tagline}</div>
              </div>
            </div>
          ))}
          <div className="sb-section">Reference</div>
          <div className="nav-extra" onClick={()=>scrollTo("dt-oop-1")}><span>◇</span> DT-OOP-1 Decision Tree</div>
          <div className="nav-extra" onClick={()=>scrollTo("quick-ref")}><span>◫</span> Quick-Reference Matrix</div>
          <div className="nav-extra" onClick={()=>scrollTo("solid-crossmap")}><span>◫</span> SOLID ↔ OOP Cross-Map</div>
        </nav>
      </aside>

      <main className="main">
        <div className="topbar">
          <SearchBar query={searchQuery} setQuery={setSearchQuery}/>
          {results && <div className="search-results">
            {results.length===0 ? <div className="sr-empty">No matches for "{searchQuery}"</div>
            : results.map((r,i) => <div key={i} className="sr-item" onClick={()=>scrollTo(r.id)}>
              <span className={`sr-type ${r.type}`}>{r.type.replace("-"," ")}</span>
              <span className="sr-title">{r.title}</span>
              {r.sub && <span className="sr-sub">{r.sub}</span>}
            </div>)}
          </div>}
        </div>

        <div className="content" ref={contentRef}>
          <div className="pg-header">
            <div className="pg-bc">guide / <span>oop-fundamentals</span></div>
            <h1 className="pg-title">The Four Pillars</h1>
            <p className="pg-sub">Every pattern in this guide implements one or more of these four principles. Each pillar maps to existing labels, provides trade-off analysis, and catalogues anti-patterns.</p>
            <div className="pg-cards">
              {PILLARS.map(p => <div key={p.id} className="pg-card" onClick={()=>scrollTo(p.id)}>
                <div className="pc-num">{p.num}</div>
                <div className="pc-title">{p.title}</div>
                <div className="pc-count">{p.examples.length} examples · {p.antiPatterns.length} anti-patterns</div>
              </div>)}
            </div>
          </div>

          <LabelLegend/>
          <DecisionTree scrollTo={scrollTo}/>
          {PILLARS.map(p => <PillarSection key={p.id} pillar={p} isActive={activeId===p.id}/>)}
          <QRTable data={QUICK_REF}/>
          <QRTable data={SOLID_MAP}/>
        </div>
      </main>
    </div>
  );
}
