import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ════════════════════════════════════════════════════════════════════════════
   DATA — OOP Fundamentals: The Four Pillars
   ════════════════════════════════════════════════════════════════════════════ */

const PILLARS = [
  {
    id: "oop-encap",
    label: "OOP-ENCAP",
    num: "01",
    title: "Encapsulation",
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
        ["Name mangling (__attr)", "Harder to access accidentally from subclasses", "Obscures intent; still accessible via _ClassName__attr", "Rare — only when subclass collision is genuine risk"]
      ]
    },
    examples: [
      {
        id: "encap-ex1",
        title: "TicketPrice — Immutable value object",
        refs: ["OBJ-1", "DEC-1"],
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
        return self._currency`
      },
      {
        id: "encap-ex2",
        title: "VenueConfig — Defensive copying",
        refs: ["OBJ-2"],
        code: `class VenueConfig:
    def __init__(self, settings: dict = None):
        self._settings = dict(settings) if settings else {}  # Copy on intake

    def get(self, key: str, default=None):
        return self._settings.get(key, default)

    def set(self, key: str, value) -> None:  # [CAT-2] Controlled mutation
        self._settings[key] = value

    def get_all(self) -> dict:
        return dict(self._settings)  # Defensive copy on output`
      },
      {
        id: "encap-ex3",
        title: "ImmutableConfig — Read-only enforcement",
        refs: ["MappingProxyType"],
        code: `from types import MappingProxyType

class ImmutableConfig:
    def __init__(self, settings: dict):
        self._settings = MappingProxyType(dict(settings))

    @property
    def settings(self) -> MappingProxyType:
        """Read-only view — mutations raise TypeError."""
        return self._settings`
      }
    ],
    antiPatterns: [
      {
        id: "ENCAP-AP1",
        name: "Public mutable internal",
        symptom: "Callers freely mutate internal state",
        bad: `class Bad:
    def __init__(self, data):
        self.data = data  # Public — caller mutates freely`,
        fix: `class Good:
    def __init__(self, data):
        self._data = dict(data)  # Defensive copy + private`
      },
      {
        id: "ENCAP-AP2",
        name: "Mutable default argument",
        symptom: "All instances share the same dict/list",
        bad: `class Config:
    def __init__(self, settings: dict = {}):
        self.settings = settings  # Shared across ALL instances`,
        fix: `class Config:
    def __init__(self, settings: dict = None):
        self._settings = dict(settings) if settings else {}`
      },
      {
        id: "ENCAP-AP3",
        name: "Getter/setter with no logic",
        symptom: "Java ceremony — adds nothing in Python",
        bad: `class OverEngineered:
    def __init__(self):
        self._x = 0
    def get_x(self):
        return self._x
    def set_x(self, v):
        self._x = v`,
        fix: `class Simple:
    def __init__(self):
        self.x = 0  # Direct — no logic needed

# OR with validation:
class Validated:
    @property
    def x(self) -> int:
        return self._x
    @x.setter
    def x(self, value: int) -> None:
        if value < 0:
            raise ValueError("x must be non-negative")
        self._x = value`
      },
      {
        id: "ENCAP-AP4",
        name: "Leaking internal collection",
        symptom: "Caller can mutate internal state via returned reference",
        bad: `class BadPlaylist:
    def get_songs(self) -> list:
        return self._songs  # Caller: get_songs().append("Malicious")`,
        fix: `class Playlist:
    def get_songs(self) -> tuple:
        return tuple(self._songs)  # Immutable snapshot`
      }
    ]
  },
  {
    id: "oop-abstr",
    label: "OOP-ABSTR",
    num: "02",
    title: "Abstraction",
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
        ["Protocol (PRT-1–PRT-3)", "Structural typing — no forced inheritance; cross-package", "No shared impl; runtime isinstance needs runtime_checkable", "Public API boundaries, inter-service contracts, DI"],
        ["ABC (B.2.1)", "Enforced contract (cannot instantiate incomplete); mixed abstract + concrete", "Forces inheritance coupling; rigid hierarchy", "Shared implementation across related types; framework extension points"],
        ["Facade (PAT-4)", "Simplifies complex subsystems; reduces coupling surface", "Adds indirection; can become god class if overstuffed", "Orchestrating 3+ subsystems behind single use-case entry"],
        ["Duck typing (no annotation)", "Maximum flexibility; zero ceremony", "No static checking; errors at runtime; harder to discover", "Internal wiring between tightly-coupled modules"]
      ]
    },
    examples: [
      {
        id: "abstr-ex1",
        title: "Protocol as abstraction boundary",
        refs: ["PRT-2", "POLY-2"],
        code: `from typing import Protocol

class PaymentGateway(Protocol):
    """Callers see ONLY this interface — implementation hidden."""
    def charge(self, amount: int) -> str: ...
    def refund(self, tx_id: str) -> bool: ...`
      },
      {
        id: "abstr-ex2",
        title: "ABC with template method",
        refs: ["B.2.1", "PAT-9"],
        code: `from abc import ABC, abstractmethod

class BaseProcessor(ABC):
    """Skeleton algorithm — subclasses fill in the steps."""

    def process(self, data: dict) -> dict:
        validated = self.validate(data)    # Shared sequencing
        return self.transform(validated)   # Subclass-specific

    @abstractmethod
    def validate(self, data: dict) -> dict: ...

    @abstractmethod
    def transform(self, data: dict) -> dict: ...`
      },
      {
        id: "abstr-ex3",
        title: "Boundary decision tree",
        refs: ["DT-PRT-1"],
        code: `# Which abstraction tool?
# ─────────────────────────
# IO boundary (DB, API, queue)  → Protocol [PRT-2]
# Shared impl + enforced contract → ABC [B.2.1]
# Pure domain, no second impl    → Concrete class (YAGNI)
# Hide subsystem complexity      → Facade [PAT-4]`
      },
      {
        id: "abstr-ex4",
        title: "VenuePlugin — ABC with shared behaviour",
        refs: ["PRT-5", "B.2.1"],
        code: `class VenuePlugin(ABC):
    @abstractmethod
    def get_name(self) -> str: ...

    @abstractmethod
    def get_capacity(self) -> int: ...

    @abstractmethod
    def emergency_evacuation_plan(self) -> str: ...

    # Concrete shared behaviour
    def is_large_venue(self) -> bool:
        return self.get_capacity() > 5000


class RoxyTheatre(VenuePlugin):
    def get_name(self) -> str:
        return "Roxy Theatre"

    def get_capacity(self) -> int:
        return 2000

    def emergency_evacuation_plan(self) -> str:
        return "Exit via north and south doors"`
      },
      {
        id: "abstr-ex5",
        title: "BookingFacade — hiding subsystem complexity",
        refs: ["PAT-4"],
        code: `class BookingFacade:
    """Single entry point — hides inventory, payment, notification."""

    def __init__(self, inventory, payment, notifier):
        self._inventory = inventory
        self._payment = payment
        self._notifier = notifier

    def book(self, customer_id: str, event_id: str, seats: int) -> str:
        held = self._inventory.hold_seats(event_id, seats)
        tx = self._payment.charge(customer_id, held.total_price)
        self._notifier.send_confirmation(customer_id, tx.id)
        return tx.id`
      }
    ],
    antiPatterns: [
      {
        id: "ABSTR-AP1",
        name: "Leaky abstraction",
        symptom: "Callers must know internal storage format",
        bad: `class BadRepository:
    def get_raw_cursor(self):  # Exposes Postgres-specific cursor
        return self._db.cursor()`,
        fix: `class BookingRepository(Protocol):
    def get(self, booking_id: str) -> dict | None: ...
    def save(self, booking: dict) -> None: ...`
      },
      {
        id: "ABSTR-AP2",
        name: "Fat interface",
        symptom: "Clients depend on methods they don't use",
        bad: `class BadWorker(ABC):
    @abstractmethod
    def process(self, data): ...
    @abstractmethod
    def render_html(self, data): ...   # Unrelated!
    @abstractmethod
    def send_email(self, to, body): ... # Unrelated!`,
        fix: `class Processor(Protocol):
    def process(self, data) -> dict: ...

class Renderer(Protocol):
    def render_html(self, data) -> str: ...

class Notifier(Protocol):
    def send_email(self, to: str, body: str) -> None: ...`
      },
      {
        id: "ABSTR-AP3",
        name: "ABC with no abstract methods",
        symptom: "Pretends to enforce contract but enforces nothing",
        bad: `class FakeAbstract(ABC):
    def process(self, data):  # Not marked @abstractmethod!
        return data`,
        fix: `class RealAbstract(ABC):
    @abstractmethod
    def process(self, data) -> dict: ...`
      },
      {
        id: "ABSTR-AP4",
        name: "Over-abstraction (YAGNI)",
        symptom: "Unnecessary indirection before second implementation exists",
        bad: `# Only ONE payment processor exists:
class PaymentProcessorInterface(ABC):
    @abstractmethod
    def charge(self, amount): ...

class StripeProcessor(PaymentProcessorInterface):
    def charge(self, amount):
        stripe.charge(amount)`,
        fix: `# FIX: Use concrete class directly.
# Extract Protocol ONLY when second
# implementation materialises or you
# need test doubles at a boundary.
class StripePayment:
    def charge(self, amount):
        stripe.charge(amount)`
      }
    ]
  },
  {
    id: "oop-inher",
    label: "OOP-INHER",
    num: "03",
    title: "Inheritance",
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
        ["Single concrete inheritance", "Straightforward is-a reuse; super() chain clear", "Tight coupling; fragile base class; parent changes ripple", "True taxonomic relationship (RoxyTheatre is-a VenuePlugin)"],
        ["Mixin inheritance (ADV-MIXIN-1)", "Cross-cutting reuse without deep hierarchies", "MRO complexity; implicit deps on host attrs; hard to test alone", "Behaviour shared by 3+ unrelated classes (audit, timestamps)"],
        ["ABC + Template Method (PAT-9)", "Enforces contract + shared algorithm skeleton", "Subclass explosion if variations small; tight coupling to base", "Algorithm has fixed structure with varying steps"],
        ["Composition (default)", "Loose coupling; swap at runtime; easier to test", "More boilerplate (delegation); no auto interface propagation", "Default. Prefer unless inheritance clearly wins on clarity"]
      ]
    },
    examples: [
      {
        id: "inher-ex1",
        title: "POLY-1 — Inheritance policy",
        refs: ["POLY-1"],
        code: `# ✓ CORRECT: Single concrete + mixins
class AuditedUser(AuditMixin, TimestampMixin, Ticket):
    pass

# ✓ CORRECT: ABC + concrete
class PostgresBookingRepository(BookingRepository):  # ABC
    pass

# ✗ WRONG: Multiple concrete bases
class HybridBookingStore(FileStore, DatabaseStore):   # Both concrete!
    pass`
      },
      {
        id: "inher-ex2",
        title: "Composition over inheritance decision",
        refs: ["POLY-1"],
        code: `# Is it a true "is-a" relationship?
# ├─► YES → Does parent have shared impl you need?
# │         ├─► YES → Single concrete inheritance or ABC
# │         └─► NO  → Protocol [POLY-2] instead
# └─► NO  → Composition. Always.

class HybridStore:  # FIX: Composition
    def __init__(self, file_store: FileStore, db: DatabaseStore):
        self._file = file_store
        self._db = db`
      },
      {
        id: "inher-ex3",
        title: "ABC with template method",
        refs: ["B.2.1", "PAT-9"],
        code: `class BaseProcessor(ABC):
    """Skeleton algorithm — subclasses fill in the steps."""

    def process(self, data: dict) -> dict:
        validated = self.validate(data)
        return self.transform(validated)

    @abstractmethod
    def validate(self, data: dict) -> dict: ...

    @abstractmethod
    def transform(self, data: dict) -> dict: ...`
      }
    ],
    antiPatterns: [
      {
        id: "INHER-AP1",
        name: "Multiple concrete inheritance",
        symptom: "Diamond problem, ambiguous MRO",
        bad: `class FileStore:
    def save(self, key, data):
        write_to_disk(key, data)

class DatabaseStore:
    def save(self, key, data):
        write_to_db(key, data)

class HybridStore(FileStore, DatabaseStore):  # Which save()?
    pass`,
        fix: `class HybridStore:
    def __init__(self, file_store: FileStore, db: DatabaseStore):
        self._file = file_store
        self._db = db`
      },
      {
        id: "INHER-AP2",
        name: "Reuse without is-a",
        symptom: "Inherits methods that break the contract (LSP)",
        bad: `class Stack(list):  # Inherits sort, insert, reverse
    def push(self, item):
        self.append(item)`,
        fix: `class Stack:  # HAS-A list, IS-NOT-A list
    def __init__(self):
        self._items: list = []

    def push(self, item) -> None:
        self._items.append(item)

    def pop(self):
        if not self._items:
            raise IndexError("pop from empty stack")
        return self._items.pop()`
      },
      {
        id: "INHER-AP3",
        name: "Deep hierarchy / overriding most of parent",
        symptom: "5+ levels deep or subclass overrides >50% of parent methods",
        bad: `class Animal: ...           # Level 1
class Mammal(Animal): ...   # Level 2
class Carnivore(Mammal): ...# Level 3
class Canine(Carnivore): ...# Level 4
class Dog(Canine): ...      # Level 5
class GoldenRetriever(Dog): # Level 6 — fragile base class
    # Overrides most of Dog's methods anyway`,
        fix: `# FIX: Flatten with composition + mixins
class GoldenRetriever:
    def __init__(self):
        self._locomotion = QuadrupedMovement()
        self._diet = CarnivoreDiet()
    # Clear, flat, testable`
      },
      {
        id: "INHER-AP4",
        name: "super() chain breakage",
        symptom: "Mixin calls super().setup() but Base drops the chain",
        bad: `class Mixin:
    def setup(self):
        super().setup()       # Expects next in MRO
        self._mixin_ready = True

class Base:
    def setup(self):
        self._base_ready = True  # Does NOT call super()`,
        fix: `class Base:
    def setup(self):
        super().setup()       # Safely resolves to object
        self._base_ready = True`
      }
    ]
  },
  {
    id: "oop-poly",
    label: "OOP-POLY",
    num: "04",
    title: "Polymorphism",
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
        ["Duck typing (implicit)", "Zero ceremony; maximum flexibility", "No static checking; runtime errors; interface undiscoverable", "Internal wiring; tightly-coupled modules"],
        ["Protocol (structural)", "No forced inheritance; cross-package; static checking", "No shared impl; runtime_checkable overhead", "Public API boundaries; dependency injection"],
        ["ABC inheritance (nominal)", "Enforced contract; shared implementation; TypeError on incomplete", "Rigid hierarchy; forces inheritance", "Shared algorithm skeleton; framework extension points"],
        ["@singledispatch", "Clean type-based dispatch; extensible without editing", "Only dispatches on first arg type; registration ceremony", "Serialisation (JSON/CSV/HTML); types you don't control"],
        ["Operator overloading", "Value objects behave like built-ins; intuitive API", "Must maintain __hash__/__eq__ contract; easy to break", "True value objects only: TicketPrice, Money, Coordinate"]
      ]
    },
    examples: [
      {
        id: "poly-ex1",
        title: "POLY-2 — Polymorphism strategy",
        refs: ["POLY-2", "PRT-2"],
        code: `# Boundary type?
# ├─► Public API boundary    → Protocol [PRT-2]
# ├─► Internal wiring        → Duck typing (no annotation)
# ├─► Shared implementation   → ABC [B.2.1]
# └─► Never                  → Concrete inheritance for is-a only

class BookingRepository(Protocol):
    def get(self, id: str) -> dict | None: ...
    def save(self, entity: dict) -> None: ...`
      },
      {
        id: "poly-ex2",
        title: "Strategy pattern",
        refs: ["PAT-6", "PRT-1"],
        code: `from typing import Protocol

class PricingStrategy(Protocol):
    def calculate(self, base_price: int) -> int: ...

class StandardPricing:
    def calculate(self, base_price: int) -> int:
        return base_price

class VipPricing:
    def calculate(self, base_price: int) -> int:
        return int(base_price * 1.5)

# New tier = new class, zero existing changes
class GroupPricing:
    def calculate(self, base_price: int) -> int:
        return int(base_price * 0.7)`
      },
      {
        id: "poly-ex3",
        title: "Value object — operator overloading",
        refs: ["OBJ-1"],
        code: `from functools import total_ordering

@total_ordering
class TicketPrice:
    __slots__ = ('_amount', '_currency')

    def __init__(self, price: int, currency: str):
        self._amount = price
        self._currency = currency

    def __eq__(self, other):
        if not isinstance(other, TicketPrice):
            return False
        return self._amount == other._amount

    def __lt__(self, other):
        return self._amount < other._amount

    def __hash__(self):
        return hash((self._amount, self._currency))`
      }
    ],
    antiPatterns: [
      {
        id: "POLY-AP1",
        name: "isinstance type-switch dispatch",
        symptom: "Every new type requires editing the switch — violates OCP",
        bad: `def process(item):
    if isinstance(item, Order):
        handle_order(item)
    elif isinstance(item, Refund):
        handle_refund(item)
    # New type? Edit this function.`,
        fix: `class Processable(Protocol):
    def process(self) -> dict: ...

# Each type conforms — caller uniform:
def process(item: Processable):
    return item.process()`
      },
      {
        id: "POLY-AP2",
        name: "LSP violation — NotImplementedError",
        symptom: "Subtype refuses base contract",
        bad: `class Bird(ABC):
    @abstractmethod
    def fly(self) -> str: ...

class Penguin(Bird):
    def fly(self) -> str:
        raise NotImplementedError  # Breaks substitutability`,
        fix: `class Bird(ABC):
    @abstractmethod
    def move(self) -> str: ...

class Sparrow(Bird):
    def move(self) -> str: return "flying"

class Penguin(Bird):
    def move(self) -> str: return "swimming"`
      },
      {
        id: "POLY-AP3",
        name: "Inconsistent return types",
        symptom: "Caller can't rely on return type across implementations",
        bad: `class JsonParser:
    def parse(self, data: str) -> dict:
        return json.loads(data)

class XmlParser:
    def parse(self, data: str) -> str:  # Wrong type!
        return ET.tostring(ET.fromstring(data))`,
        fix: `class Parser(Protocol):
    def parse(self, data: str) -> dict: ...  # Contract: always dict`
      },
      {
        id: "POLY-AP4",
        name: "Breaking __hash__/__eq__ contract",
        symptom: "Equal objects hash differently — set/dict silently fail",
        bad: `class BadPrice:
    def __eq__(self, other):
        return self.amount == other.amount
    # __hash__ not defined → defaults to id()
    # set({BadPrice(100), BadPrice(100)}) → len == 2, not 1!`,
        fix: `class Price:
    def __eq__(self, other):
        if not isinstance(other, Price): return False
        return self.amount == other.amount

    def __hash__(self):
        return hash((self.amount, self.currency))`
      }
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

const SOLID_CROSSMAP = {
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
   COMPONENTS
   ════════════════════════════════════════════════════════════════════════════ */

// ─── Syntax highlighter (lightweight, Python-aware) ─────────────────────────
const pythonKeywords = new Set(["class","def","return","if","elif","else","for","while","import","from","pass","raise","None","True","False","self","not","and","or","in","is","with","as","try","except","finally","yield","async","await","lambda","break","continue","del","global","nonlocal","assert"]);
const pythonBuiltins = new Set(["int","str","float","bool","dict","list","tuple","set","frozenset","type","super","isinstance","property","classmethod","staticmethod","abstractmethod","len","sum","range","print","hash","getattr","setattr","hasattr","vars","dir","object"]);

function highlightPython(code) {
  if (!code) return "";
  const placeholders = [];
  const ph = (html) => { const id = `\x00${placeholders.length}\x00`; placeholders.push(html); return id; };

  let s = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // 1. Extract triple-quoted strings first (before comments can match inside them)
  s = s.replace(/"""[\s\S]*?"""|'''[\s\S]*?'''/g, m => ph(`<span class="hl-string">${m}</span>`));
  // 2. Extract comments (# to end of line)
  s = s.replace(/#[^\n]*/g, m => ph(`<span class="hl-comment">${m}</span>`));
  // 3. Extract single/double-quoted strings
  s = s.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, m => ph(`<span class="hl-string">${m}</span>`));
  // 4. Decorators
  s = s.replace(/^(\s*)(@\w+)/gm, (_, ws, dec) => ws + ph(`<span class="hl-decorator">${dec}</span>`));
  // 5. Labels in brackets [LABEL]
  s = s.replace(/\[[A-Z][\w.-]*\]/g, m => ph(`<span class="hl-label">${m}</span>`));
  // 6. Keywords and builtins (only outside placeholders)
  s = s.replace(/\b([A-Za-z_]\w*)\b/g, (m) => {
    if (pythonKeywords.has(m)) return ph(`<span class="hl-keyword">${m}</span>`);
    if (pythonBuiltins.has(m)) return ph(`<span class="hl-builtin">${m}</span>`);
    return m;
  });

  // Restore all placeholders
  let result = s;
  for (let i = placeholders.length - 1; i >= 0; i--) {
    result = result.replace(`\x00${i}\x00`, placeholders[i]);
  }
  return result;
}

function CodeBlock({ code, label }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="code-block">
      {label && <div className="code-label">{label}</div>}
      <button className="copy-btn" onClick={handleCopy}>
        {copied ? "✓" : "⧉"}
      </button>
      <pre><code dangerouslySetInnerHTML={{ __html: highlightPython(code) }} /></pre>
    </div>
  );
}


// ─── Anti-pattern card with toggle ──────────────────────────────────────────
function AntiPatternCard({ ap }) {
  const [showFix, setShowFix] = useState(false);
  return (
    <div className="ap-card">
      <div className="ap-header">
        <div className="ap-badge">⚠ {ap.id}</div>
        <h4>{ap.name}</h4>
        <p className="ap-symptom">{ap.symptom}</p>
      </div>
      <div className="ap-toggle-bar">
        <button
          className={`ap-toggle-btn ${!showFix ? "active" : ""}`}
          onClick={() => setShowFix(false)}
        >
          ✗ Anti-Pattern
        </button>
        <button
          className={`ap-toggle-btn ${showFix ? "active" : ""}`}
          onClick={() => setShowFix(true)}
        >
          ✓ Fix
        </button>
      </div>
      <CodeBlock code={showFix ? ap.fix : ap.bad} />
    </div>
  );
}


// ─── Cross-reference tag ────────────────────────────────────────────────────
function RefTag({ label }) {
  return <span className="ref-tag" title={`Cross-reference: ${label}`}>{label}</span>;
}


// ─── Pillar section ─────────────────────────────────────────────────────────
function PillarSection({ pillar, isActive }) {
  const [examplesOpen, setExamplesOpen] = useState(true);
  const [antiOpen, setAntiOpen] = useState(false);
  const [tradeOffsOpen, setTradeOffsOpen] = useState(false);

  return (
    <section className={`pillar-section ${isActive ? "active" : ""}`} id={pillar.id}>
      {/* Header */}
      <div className="pillar-header">
        <div className="pillar-num">{pillar.num}</div>
        <div>
          <div className="pillar-label">{pillar.label}</div>
          <h2>{pillar.title}</h2>
          <p className="pillar-tagline">{pillar.tagline}</p>
        </div>
      </div>

      {/* Definition */}
      <div className="pillar-def">
        <p>{pillar.definition}</p>
      </div>

      {/* Key Rule */}
      <div className="key-rule">
        <span className="key-rule-icon">→</span>
        <span>{pillar.keyRule}</span>
      </div>

      {/* Mechanism */}
      <div className="mechanism-row">
        <span className="mechanism-label">Core Mechanism</span>
        <div className="mechanism-tags">
          {pillar.mechanism.map(m => <span key={m} className="mech-tag">{m}</span>)}
        </div>
      </div>

      {/* Cross-refs + Test Templates */}
      <div className="refs-row">
        <div>
          <span className="refs-label">Cross-refs</span>
          <div className="refs-tags">{pillar.crossRefs.map(r => <RefTag key={r} label={r} />)}</div>
        </div>
        <div>
          <span className="refs-label">Test Templates</span>
          <div className="refs-tags">{pillar.testTemplates.map(r => <RefTag key={r} label={r} />)}</div>
        </div>
      </div>

      {/* Default Approach */}
      <div className="default-approach">
        <span className="approach-label">Default</span>
        <span>{pillar.defaultApproach}</span>
      </div>

      {/* Trade-off Analysis */}
      {pillar.tradeOffs && (
        <div className="collapsible-section">
          <button className="collapsible-header tradeoff-header" onClick={() => setTradeOffsOpen(!tradeOffsOpen)}>
            <span className="collapse-icon">{tradeOffsOpen ? "▾" : "▸"}</span>
            <span>Trade-off Analysis</span>
            <span className="collapse-count">{pillar.tradeOffs.rows.length}</span>
          </button>
          {tradeOffsOpen && (
            <div className="collapsible-body">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>{pillar.tradeOffs.headers.map(h => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {pillar.tradeOffs.rows.map((row, i) => (
                      <tr key={i}>{row.map((cell, j) => <td key={j} className={j === 0 ? "td-approach" : ""}>{cell}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Examples */}
      <div className="collapsible-section">
        <button className="collapsible-header" onClick={() => setExamplesOpen(!examplesOpen)}>
          <span className="collapse-icon">{examplesOpen ? "▾" : "▸"}</span>
          <span>GigMaster Examples</span>
          <span className="collapse-count">{pillar.examples.length}</span>
        </button>
        {examplesOpen && (
          <div className="collapsible-body">
            {pillar.examples.map(ex => (
              <div key={ex.id} className="example-card">
                <div className="example-title">
                  <span>{ex.title}</span>
                  <div className="example-refs">{ex.refs.map(r => <RefTag key={r} label={r} />)}</div>
                </div>
                <CodeBlock code={ex.code} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Anti-patterns */}
      <div className="collapsible-section">
        <button className="collapsible-header ap-section-header" onClick={() => setAntiOpen(!antiOpen)}>
          <span className="collapse-icon">{antiOpen ? "▾" : "▸"}</span>
          <span>Anti-Patterns</span>
          <span className="collapse-count warn">{pillar.antiPatterns.length}</span>
        </button>
        {antiOpen && (
          <div className="collapsible-body">
            {pillar.antiPatterns.map(ap => <AntiPatternCard key={ap.id} ap={ap} />)}
          </div>
        )}
      </div>
    </section>
  );
}


// ─── Decision Tree Diagram (DT-OOP-1) ───────────────────────────────────────

const DT_PANELS = [
  { id: "overview", label: "Overview", color: "var(--accent-3)" },
  { id: "encap", label: "Encapsulation", color: "var(--accent-2)" },
  { id: "abstr", label: "Abstraction", color: "var(--accent-4)" },
  { id: "inher", label: "Inheritance", color: "var(--accent-1)" },
  { id: "poly", label: "Polymorphism", color: "var(--yellow)" },
];

function DiagramBox({ x, y, w, h, fill, stroke, rx, children, onClick, className="" }) {
  return (
    <g className={`dia-node ${className}`} onClick={onClick} style={onClick ? {cursor:"pointer"} : {}}>
      <rect x={x} y={y} width={w} height={h} rx={rx||6} fill={fill||"var(--bg-2)"} stroke={stroke||"var(--border-light)"} strokeWidth="0.7"/>
      {children}
    </g>
  );
}

function DiagramArrow({ x1, y1, x2, y2, dashed }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--text-3)" strokeWidth="0.8" markerEnd="url(#dt-arrow)" strokeDasharray={dashed ? "4 3" : "none"} />;
}

function DiagramLabel({ x, y, children, anchor="middle", size=11, color="var(--text-2)", weight=400 }) {
  return <text x={x} y={y} textAnchor={anchor} dominantBaseline="central" fill={color} fontSize={size} fontFamily="'IBM Plex Mono', monospace" fontWeight={weight}>{children}</text>;
}

function DTOverview({ onNav }) {
  const pillars = [
    { key:"encap", label:"Encapsulation", sub:"Hide internal state", x:28, color:"var(--accent-2)", colorDim:"rgba(133,205,202,0.12)", border:"rgba(133,205,202,0.3)" },
    { key:"abstr", label:"Abstraction", sub:"What, not how", x:188, color:"var(--accent-4)", colorDim:"rgba(121,184,255,0.12)", border:"rgba(121,184,255,0.3)" },
    { key:"inher", label:"Inheritance", sub:"Is-a reuse", x:348, color:"var(--accent-1)", colorDim:"rgba(232,168,124,0.12)", border:"rgba(232,168,124,0.3)" },
    { key:"poly", label:"Polymorphism", sub:"Same interface", x:508, color:"var(--yellow)", colorDim:"rgba(252,211,77,0.12)", border:"rgba(252,211,77,0.3)" },
  ];
  return (
    <svg width="100%" viewBox="0 0 680 440" style={{display:"block"}}>
      <defs>
        <marker id="dt-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M2 1.5L8 5L2 8.5" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </marker>
      </defs>
      {/* Start */}
      <DiagramBox x={220} y={16} w={240} h={36} rx={18} fill="var(--bg-3)" stroke="var(--border-light)">
        <DiagramLabel x={340} y={34} size={12} color="var(--text-1)" weight={500}>New class or method to write</DiagramLabel>
      </DiagramBox>
      <DiagramArrow x1={340} y1={52} x2={340} y2={76}/>
      {/* Central decision */}
      <DiagramBox x={160} y={76} w={360} h={48} fill="rgba(196,155,222,0.1)" stroke="rgba(196,155,222,0.3)" rx={8}>
        <DiagramLabel x={340} y={92} size={12} color="var(--accent-3)" weight={600}>Which OOP pillar? — DT-OOP-1</DiagramLabel>
        <DiagramLabel x={340} y={108} size={10} color="var(--text-2)">Walk each relevant branch in turn</DiagramLabel>
      </DiagramBox>
      {/* Arrows to pillars */}
      {pillars.map((p,i) => {
        const cx = p.x + 72;
        const fromX = 180 + i * 90;
        return <DiagramArrow key={p.key} x1={fromX} y1={124} x2={cx} y2={150}/>;
      })}
      {/* Pillar boxes */}
      {pillars.map((p) => (
        <DiagramBox key={p.key} x={p.x} y={150} w={144} h={52} fill={p.colorDim} stroke={p.border} rx={8} onClick={() => onNav(p.key)} className="dia-clickable">
          <DiagramLabel x={p.x+72} y={168} size={12} color={p.color} weight={600}>{p.label}</DiagramLabel>
          <DiagramLabel x={p.x+72} y={186} size={10} color="var(--text-2)">{p.sub}</DiagramLabel>
        </DiagramBox>
      ))}
      {/* Decision gates */}
      {pillars.map((p) => {
        const cx = p.x + 72;
        return <g key={p.key+"g"}>
          <DiagramArrow x1={cx} y1={202} x2={cx} y2={228}/>
          <DiagramBox x={p.x+12} y={228} w={120} h={32} fill="var(--bg-2)" stroke={p.border} rx={4}>
            <DiagramLabel x={cx} y={244} size={10} color="var(--text-2)">
              {p.key==="encap"?"State exposed?":p.key==="abstr"?"Boundary type?":p.key==="inher"?"True is-a?":"Poly kind?"}
            </DiagramLabel>
          </DiagramBox>
          <DiagramArrow x1={cx} y1={260} x2={cx} y2={286}/>
          <DiagramBox x={p.x+4} y={286} w={136} h={32} fill="rgba(248,113,113,0.06)" stroke="rgba(248,113,113,0.2)" rx={4}>
            <DiagramLabel x={cx} y={302} size={10} color="var(--red)">Anti-pattern audit</DiagramLabel>
          </DiagramBox>
          <DiagramArrow x1={cx} y1={318} x2={cx} y2={348}/>
        </g>;
      })}
      {/* Converge to "more pillars?" */}
      <DiagramBox x={170} y={348} w={340} h={40} fill="rgba(196,155,222,0.07)" stroke="rgba(196,155,222,0.25)" rx={8}>
        <DiagramLabel x={340} y={368} size={12} color="var(--accent-3)" weight={500}>More pillars to apply?</DiagramLabel>
      </DiagramBox>
      {/* Feedback loop */}
      <path d="M170 368 L120 368 L120 100 L160 100" fill="none" stroke="var(--text-3)" strokeWidth="0.8" strokeDasharray="4 3" markerEnd="url(#dt-arrow)"/>
      <DiagramLabel x={108} y={356} size={9} color="var(--text-3)" anchor="end">Yes</DiagramLabel>
      {/* Done */}
      <DiagramArrow x1={510} y1={368} x2={570} y2={400}/>
      <DiagramLabel x={548} y={382} size={9} color="var(--text-3)">No</DiagramLabel>
      <DiagramBox x={520} y={400} w={140} h={28} rx={14} fill="rgba(110,231,183,0.08)" stroke="rgba(110,231,183,0.25)">
        <DiagramLabel x={590} y={414} size={10} color="var(--green)">Done → apply SOLID</DiagramLabel>
      </DiagramBox>
    </svg>
  );
}

function DTEncap({ scrollTo }) {
  return (
    <svg width="100%" viewBox="0 0 680 460" style={{display:"block"}}>
      <defs><marker id="dt-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M2 1.5L8 5L2 8.5" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></marker></defs>
      <DiagramBox x={220} y={16} w={240} h={36} rx={18} fill="rgba(133,205,202,0.12)" stroke="rgba(133,205,202,0.3)">
        <DiagramLabel x={340} y={34} size={12} color="var(--accent-2)" weight={600}>Encapsulation branch</DiagramLabel>
      </DiagramBox>
      <DiagramArrow x1={340} y1={52} x2={340} y2={76}/>
      <DiagramBox x={200} y={76} w={280} h={36} fill="rgba(133,205,202,0.08)" stroke="rgba(133,205,202,0.25)" rx={6}>
        <DiagramLabel x={340} y={94} size={12} color="var(--accent-2)" weight={500}>Is internal state exposed to callers?</DiagramLabel>
      </DiagramBox>
      <DiagramArrow x1={260} y1={112} x2={150} y2={146}/>
      <DiagramLabel x={196} y={124} size={10} color="var(--green)">Yes — fix it</DiagramLabel>
      <DiagramArrow x1={420} y1={112} x2={530} y2={146}/>
      <DiagramLabel x={484} y={124} size={10} color="var(--text-2)">No — audit</DiagramLabel>
      {/* Fix box */}
      <DiagramBox x={40} y={146} w={220} h={130} fill="rgba(121,184,255,0.07)" stroke="rgba(121,184,255,0.2)" rx={6} onClick={scrollTo ? ()=>scrollTo("oop-encap"):undefined} className="dia-clickable">
        <DiagramLabel x={150} y={166} size={12} color="var(--accent-4)" weight={600}>Fix: bundle and hide state</DiagramLabel>
        <DiagramLabel x={150} y={186} size={10} color="var(--text-2)">_private convention</DiagramLabel>
        <DiagramLabel x={150} y={202} size={10} color="var(--text-2)">@property — DEC-1</DiagramLabel>
        <DiagramLabel x={150} y={218} size={10} color="var(--text-2)">__slots__ — OBJ-1</DiagramLabel>
        <DiagramLabel x={150} y={234} size={10} color="var(--text-2)">MappingProxyType</DiagramLabel>
        <DiagramLabel x={150} y={250} size={10} color="var(--text-2)">Defensive copy — OBJ-2</DiagramLabel>
        <DiagramLabel x={150} y={268} size={10} color="var(--accent-1)">Tell, don't ask</DiagramLabel>
      </DiagramBox>
      {/* Anti-pattern audit box */}
      <DiagramBox x={420} y={146} w={220} h={130} fill="rgba(248,113,113,0.05)" stroke="rgba(248,113,113,0.2)" rx={6}>
        <DiagramLabel x={530} y={166} size={12} color="var(--red)" weight={500}>Anti-pattern audit</DiagramLabel>
        <DiagramLabel x={530} y={188} size={10} color="var(--text-2)">Public mutable internal?</DiagramLabel>
        <DiagramLabel x={530} y={204} size={10} color="var(--text-2)">Mutable default arg?</DiagramLabel>
        <DiagramLabel x={530} y={220} size={10} color="var(--text-2)">No-op getter/setter?</DiagramLabel>
        <DiagramLabel x={530} y={236} size={10} color="var(--text-2)">Leaked collection ref?</DiagramLabel>
        <DiagramLabel x={530} y={258} size={10} color="var(--orange)">Any yes → fix before continuing</DiagramLabel>
      </DiagramBox>
      {/* Converge */}
      <DiagramArrow x1={260} y1={276} x2={340} y2={310}/>
      <DiagramArrow x1={420} y1={276} x2={340} y2={310}/>
      <DiagramBox x={200} y={310} w={280} h={36} fill="rgba(133,205,202,0.06)" stroke="rgba(133,205,202,0.2)" rx={6}>
        <DiagramLabel x={340} y={328} size={11} color="var(--accent-2)">Validate state in every mutating method</DiagramLabel>
      </DiagramBox>
      <DiagramArrow x1={340} y1={346} x2={340} y2={380}/>
      <DiagramBox x={220} y={380} w={240} h={34} fill="var(--bg-3)" stroke="var(--border-light)" rx={6}>
        <DiagramLabel x={340} y={397} size={11} color="var(--text-1)">More pillars? → loop or done</DiagramLabel>
      </DiagramBox>
      <path d="M220 397 L160 397 L160 94 L200 94" fill="none" stroke="var(--text-3)" strokeWidth="0.7" strokeDasharray="4 3" markerEnd="url(#dt-arrow)"/>
      <DiagramLabel x={152} y={386} size={9} color="var(--text-3)" anchor="end">Yes</DiagramLabel>
      <DiagramArrow x1={460} y1={397} x2={530} y2={428}/>
      <DiagramLabel x={504} y={410} size={9} color="var(--text-3)">No</DiagramLabel>
      <DiagramBox x={500} y={420} w={120} h={24} rx={12} fill="rgba(110,231,183,0.08)" stroke="rgba(110,231,183,0.2)">
        <DiagramLabel x={560} y={432} size={10} color="var(--green)">Done → SOLID</DiagramLabel>
      </DiagramBox>
    </svg>
  );
}

function DTAbstr() {
  return (
    <svg width="100%" viewBox="0 0 680 470" style={{display:"block"}}>
      <defs><marker id="dt-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M2 1.5L8 5L2 8.5" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></marker></defs>
      <DiagramBox x={220} y={16} w={240} h={36} rx={18} fill="rgba(121,184,255,0.12)" stroke="rgba(121,184,255,0.3)">
        <DiagramLabel x={340} y={34} size={12} color="var(--accent-4)" weight={600}>Abstraction branch</DiagramLabel>
      </DiagramBox>
      <DiagramArrow x1={340} y1={52} x2={340} y2={76}/>
      <DiagramBox x={200} y={76} w={280} h={36} fill="rgba(121,184,255,0.08)" stroke="rgba(121,184,255,0.25)" rx={6}>
        <DiagramLabel x={340} y={94} size={12} color="var(--accent-4)" weight={500}>What kind of boundary is this?</DiagramLabel>
      </DiagramBox>
      {/* 4 branches */}
      {[
        { label:"Protocol", sub:"Always at IO", sub2:"PRT-2, PRT-4", x:32, fill:"rgba(121,184,255,0.08)", border:"rgba(121,184,255,0.2)", col:"var(--accent-4)" },
        { label:"ABC", sub:"Shared impl +", sub2:"contract — B.2.1", x:192, fill:"rgba(121,184,255,0.08)", border:"rgba(121,184,255,0.2)", col:"var(--accent-4)" },
        { label:"YAGNI", sub:"No Protocol yet", sub2:"Use concrete class", x:352, fill:"rgba(252,211,77,0.06)", border:"rgba(252,211,77,0.2)", col:"var(--yellow)" },
        { label:"Facade", sub:"Single entry point", sub2:"PAT-4", x:512, fill:"rgba(121,184,255,0.08)", border:"rgba(121,184,255,0.2)", col:"var(--accent-4)" },
      ].map((b,i) => {
        const cx = b.x + 68;
        const fromX = 230 + i * 72;
        return <g key={b.label}>
          <DiagramArrow x1={fromX} y1={112} x2={cx} y2={146}/>
          <DiagramBox x={b.x} y={146} w={136} h={72} fill={b.fill} stroke={b.border} rx={6}>
            <DiagramLabel x={cx} y={164} size={12} color={b.col} weight={600}>{b.label}</DiagramLabel>
            <DiagramLabel x={cx} y={182} size={10} color="var(--text-2)">{b.sub}</DiagramLabel>
            <DiagramLabel x={cx} y={196} size={10} color="var(--text-2)">{b.sub2}</DiagramLabel>
          </DiagramBox>
          <DiagramArrow x1={cx} y1={218} x2={cx} y2={256}/>
        </g>;
      })}
      {/* Anti-pattern check */}
      <DiagramBox x={80} y={256} w={520} h={86} fill="rgba(248,113,113,0.04)" stroke="rgba(248,113,113,0.18)" rx={6}>
        <DiagramLabel x={340} y={274} size={12} color="var(--red)" weight={500}>Anti-pattern check</DiagramLabel>
        <DiagramLabel x={340} y={294} size={10} color="var(--text-2)">Leaky abstraction? Exposes storage internals</DiagramLabel>
        <DiagramLabel x={340} y={310} size={10} color="var(--text-2)">Fat interface? Client imports unused methods</DiagramLabel>
        <DiagramLabel x={340} y={326} size={10} color="var(--text-2)">ABC with no @abstractmethod? Enforces nothing</DiagramLabel>
      </DiagramBox>
      <DiagramArrow x1={340} y1={342} x2={340} y2={376}/>
      <DiagramBox x={220} y={376} w={240} h={34} fill="var(--bg-3)" stroke="var(--border-light)" rx={6}>
        <DiagramLabel x={340} y={393} size={11} color="var(--text-1)">More pillars? → loop or done</DiagramLabel>
      </DiagramBox>
      <path d="M220 393 L160 393 L160 94 L200 94" fill="none" stroke="var(--text-3)" strokeWidth="0.7" strokeDasharray="4 3" markerEnd="url(#dt-arrow)"/>
      <DiagramLabel x={152} y={382} size={9} color="var(--text-3)" anchor="end">Yes</DiagramLabel>
      <DiagramArrow x1={460} y1={393} x2={530} y2={424}/>
      <DiagramLabel x={504} y={406} size={9} color="var(--text-3)">No</DiagramLabel>
      <DiagramBox x={500} y={416} w={120} h={24} rx={12} fill="rgba(110,231,183,0.08)" stroke="rgba(110,231,183,0.2)">
        <DiagramLabel x={560} y={428} size={10} color="var(--green)">Done → SOLID</DiagramLabel>
      </DiagramBox>
    </svg>
  );
}

function DTInher() {
  return (
    <svg width="100%" viewBox="0 0 680 500" style={{display:"block"}}>
      <defs><marker id="dt-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M2 1.5L8 5L2 8.5" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></marker></defs>
      <DiagramBox x={220} y={16} w={240} h={36} rx={18} fill="rgba(232,168,124,0.12)" stroke="rgba(232,168,124,0.3)">
        <DiagramLabel x={340} y={34} size={12} color="var(--accent-1)" weight={600}>Inheritance branch</DiagramLabel>
      </DiagramBox>
      <DiagramArrow x1={340} y1={52} x2={340} y2={76}/>
      <DiagramBox x={180} y={76} w={320} h={36} fill="rgba(232,168,124,0.08)" stroke="rgba(232,168,124,0.25)" rx={6}>
        <DiagramLabel x={340} y={94} size={12} color="var(--accent-1)" weight={500}>True is-a with no exceptions?</DiagramLabel>
      </DiagramBox>
      <DiagramArrow x1={240} y1={112} x2={140} y2={148}/>
      <DiagramLabel x={180} y={124} size={10} color="var(--red)">No</DiagramLabel>
      <DiagramArrow x1={440} y1={112} x2={540} y2={148}/>
      <DiagramLabel x={498} y={124} size={10} color="var(--green)">Yes</DiagramLabel>
      {/* Composition */}
      <DiagramBox x={32} y={148} w={216} h={72} fill="rgba(248,113,113,0.06)" stroke="rgba(248,113,113,0.2)" rx={6}>
        <DiagramLabel x={140} y={168} size={12} color="var(--red)" weight={500}>Use composition</DiagramLabel>
        <DiagramLabel x={140} y={188} size={10} color="var(--text-2)">Inject the collaborator</DiagramLabel>
        <DiagramLabel x={140} y={204} size={10} color="var(--text-2)">Delegate, don't inherit</DiagramLabel>
      </DiagramBox>
      {/* POLY-1 */}
      <DiagramBox x={432} y={148} w={216} h={72} fill="rgba(232,168,124,0.08)" stroke="rgba(232,168,124,0.25)" rx={6}>
        <DiagramLabel x={540} y={168} size={12} color="var(--accent-1)" weight={600}>POLY-1 hard rule</DiagramLabel>
        <DiagramLabel x={540} y={188} size={10} color="var(--text-2)">Max 1 concrete base</DiagramLabel>
        <DiagramLabel x={540} y={204} size={10} color="var(--text-2)">Mixins left of concrete in MRO</DiagramLabel>
      </DiagramBox>
      <DiagramArrow x1={540} y1={220} x2={540} y2={256}/>
      <DiagramBox x={400} y={256} w={280} h={36} fill="rgba(232,168,124,0.06)" stroke="rgba(232,168,124,0.2)" rx={6}>
        <DiagramLabel x={540} y={274} size={12} color="var(--accent-1)" weight={500}>Every class calls super()?</DiagramLabel>
      </DiagramBox>
      <DiagramArrow x1={460} y1={292} x2={340} y2={328}/>
      <DiagramLabel x={390} y={304} size={10} color="var(--red)">No</DiagramLabel>
      <DiagramArrow x1={620} y1={292} x2={620} y2={328}/>
      <DiagramLabel x={632} y={314} size={10} color="var(--green)">Yes</DiagramLabel>
      {/* Fix super */}
      <DiagramBox x={220} y={328} w={240} h={60} fill="rgba(248,113,113,0.06)" stroke="rgba(248,113,113,0.18)" rx={6}>
        <DiagramLabel x={340} y={348} size={12} color="var(--red)" weight={500}>Fix: add super() everywhere</DiagramLabel>
        <DiagramLabel x={340} y={368} size={10} color="var(--text-2)">Even Base must call super()</DiagramLabel>
        <DiagramLabel x={340} y={382} size={10} color="var(--text-2)">Resolves safely to object</DiagramLabel>
      </DiagramBox>
      <DiagramArrow x1={340} y1={388} x2={340} y2={418}/>
      <line x1={620} y1={328} x2={620} y2={435} stroke="var(--text-3)" strokeWidth="0.8"/>
      <line x1={620} y1={435} x2={580} y2={435} stroke="var(--text-3)" strokeWidth="0.8" markerEnd="url(#dt-arrow)"/>
      <line x1={140} y1={220} x2={140} y2={435} stroke="var(--text-3)" strokeWidth="0.8"/>
      <line x1={140} y1={435} x2={200} y2={435} stroke="var(--text-3)" strokeWidth="0.8" markerEnd="url(#dt-arrow)"/>
      {/* AP check */}
      <DiagramBox x={200} y={418} w={380} h={48} fill="rgba(248,113,113,0.04)" stroke="rgba(248,113,113,0.18)" rx={6}>
        <DiagramLabel x={390} y={436} size={11} color="var(--red)" weight={500}>Anti-pattern check</DiagramLabel>
        <DiagramLabel x={390} y={452} size={10} color="var(--text-2)">Diamond? · 5+ levels deep? · Overriding most of parent?</DiagramLabel>
      </DiagramBox>
    </svg>
  );
}

function DTPoly() {
  const kinds = [
    { label:"Strategy", sub:"PAT-6", sub2:"Runtime swap", x:24 },
    { label:"Repository", sub:"PRT-2", sub2:"Data sources", x:148 },
    { label:"Template", sub:"PAT-9", sub2:"ABC skeleton", x:272 },
    { label:"Operators", sub:"OBJ-1", sub2:"Value objects", x:396 },
    { label:"Dispatch", sub:"Type-based", sub2:"routing", x:528 },
  ];
  return (
    <svg width="100%" viewBox="0 0 680 530" style={{display:"block"}}>
      <defs><marker id="dt-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M2 1.5L8 5L2 8.5" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></marker></defs>
      <DiagramBox x={220} y={16} w={240} h={36} rx={18} fill="rgba(252,211,77,0.12)" stroke="rgba(252,211,77,0.3)">
        <DiagramLabel x={340} y={34} size={12} color="var(--yellow)" weight={600}>Polymorphism branch</DiagramLabel>
      </DiagramBox>
      <DiagramArrow x1={340} y1={52} x2={340} y2={76}/>
      <DiagramBox x={160} y={76} w={360} h={36} fill="rgba(252,211,77,0.06)" stroke="rgba(252,211,77,0.2)" rx={6}>
        <DiagramLabel x={340} y={94} size={12} color="var(--yellow)" weight={500}>What kind of polymorphism? — POLY-2</DiagramLabel>
      </DiagramBox>
      {kinds.map((k,i) => {
        const cx = k.x + 60;
        const fromX = 200 + i * 64;
        return <g key={k.label}>
          <DiagramArrow x1={fromX} y1={112} x2={cx} y2={144}/>
          <DiagramBox x={k.x} y={144} w={120} h={66} fill="rgba(252,211,77,0.05)" stroke="rgba(252,211,77,0.18)" rx={6}>
            <DiagramLabel x={cx} y={160} size={11} color="var(--yellow)" weight={600}>{k.label}</DiagramLabel>
            <DiagramLabel x={cx} y={178} size={10} color="var(--text-2)">{k.sub}</DiagramLabel>
            <DiagramLabel x={cx} y={194} size={10} color="var(--text-2)">{k.sub2}</DiagramLabel>
          </DiagramBox>
        </g>;
      })}
      {/* Dispatch sub-decision */}
      <DiagramArrow x1={588} y1={210} x2={588} y2={240}/>
      <DiagramBox x={480} y={240} w={180} h={36} fill="rgba(252,211,77,0.06)" stroke="rgba(252,211,77,0.18)" rx={6}>
        <DiagramLabel x={570} y={258} size={11} color="var(--yellow)" weight={500}>Domain or serialisation?</DiagramLabel>
      </DiagramBox>
      <DiagramArrow x1={520} y1={276} x2={460} y2={306}/>
      <DiagramLabel x={484} y={288} size={10} color="var(--red)">Domain</DiagramLabel>
      <DiagramArrow x1={640} y1={276} x2={640} y2={306}/>
      <DiagramLabel x={650} y={294} size={10} color="var(--green)">Serde</DiagramLabel>
      <DiagramBox x={370} y={306} w={180} h={44} fill="rgba(248,113,113,0.06)" stroke="rgba(248,113,113,0.18)" rx={6}>
        <DiagramLabel x={460} y={322} size={11} color="var(--red)" weight={500}>Redesign → Protocol</DiagramLabel>
        <DiagramLabel x={460} y={338} size={10} color="var(--text-2)">Violates OCP</DiagramLabel>
      </DiagramBox>
      <DiagramBox x={580} y={306} w={100} h={44} fill="rgba(110,231,183,0.06)" stroke="rgba(110,231,183,0.2)" rx={6}>
        <DiagramLabel x={630} y={322} size={11} color="var(--green)" weight={500}>Acceptable</DiagramLabel>
        <DiagramLabel x={630} y={338} size={10} color="var(--text-2)">JSON/CSV/HTML</DiagramLabel>
      </DiagramBox>
      {/* Lines to AP check */}
      {[84,208,332,460,630].map(cx => <line key={cx} x1={cx} y1={cx>400?350:210} x2={cx} y2={390} stroke="var(--text-3)" strokeWidth="0.6"/>)}
      {/* AP check */}
      <DiagramBox x={40} y={390} w={600} h={68} fill="rgba(248,113,113,0.04)" stroke="rgba(248,113,113,0.18)" rx={6}>
        <DiagramLabel x={340} y={410} size={12} color="var(--red)" weight={500}>Anti-pattern check</DiagramLabel>
        <DiagramLabel x={340} y={430} size={10} color="var(--text-2)">isinstance switch → Protocol · NotImplementedError → redesign</DiagramLabel>
        <DiagramLabel x={340} y={446} size={10} color="var(--text-2)">Inconsistent returns → contract · Broken hash/eq → always pair</DiagramLabel>
      </DiagramBox>
      <DiagramArrow x1={340} y1={458} x2={340} y2={490}/>
      <DiagramBox x={220} y={490} w={240} h={30} fill="var(--bg-3)" stroke="var(--border-light)" rx={6}>
        <DiagramLabel x={340} y={505} size={11} color="var(--text-1)">More pillars? → loop or done</DiagramLabel>
      </DiagramBox>
    </svg>
  );
}

function DecisionTreeDiagram({ scrollTo }) {
  const [activePanel, setActivePanel] = useState("overview");

  const handleNav = (key) => {
    const map = { encap: "encap", abstr: "abstr", inher: "inher", poly: "poly" };
    setActivePanel(map[key] || "overview");
  };

  return (
    <div className="dt-diagram" id="dt-oop-1">
      <div className="dt-header">
        <span className="dt-label">DT-OOP-1</span>
        <span className="dt-title">Four Pillars Decision Tree</span>
      </div>
      <div className="dt-tabs">
        {DT_PANELS.map(p => (
          <button
            key={p.id}
            className={`dt-tab ${activePanel === p.id ? "active" : ""}`}
            onClick={() => setActivePanel(p.id)}
            style={activePanel === p.id ? { borderColor: p.color, color: p.color } : {}}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="dt-canvas">
        {activePanel === "overview" && <DTOverview onNav={handleNav} />}
        {activePanel === "encap" && <DTEncap scrollTo={scrollTo} />}
        {activePanel === "abstr" && <DTAbstr />}
        {activePanel === "inher" && <DTInher />}
        {activePanel === "poly" && <DTPoly />}
      </div>
    </div>
  );
}


// ─── Quick Reference Table ──────────────────────────────────────────────────
function QuickRefTable({ data }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="collapsible-section qr-section" id="quick-ref">
      <button className="collapsible-header" onClick={() => setOpen(!open)}>
        <span className="collapse-icon">{open ? "▾" : "▸"}</span>
        <span>{data.title}</span>
      </button>
      {open && (
        <div className="collapsible-body">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>{data.headers.map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Search ─────────────────────────────────────────────────────────────────
function SearchBar({ query, setQuery }) {
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setQuery("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setQuery]);

  return (
    <div className="search-bar">
      <span className="search-icon">⌕</span>
      <input
        ref={inputRef}
        type="text"
        placeholder="Search labels, patterns, code…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query ? (
        <button className="search-clear" onClick={() => setQuery("")}>✕</button>
      ) : (
        <kbd className="search-shortcut">⌘K</kbd>
      )}
    </div>
  );
}


// ─── Search results ─────────────────────────────────────────────────────────
function useSearch(query) {
  return useMemo(() => {
    if (!query || query.length < 2) return null;
    const q = query.toLowerCase();
    const results = [];

    PILLARS.forEach(pillar => {
      // Match pillar itself
      const pillarMatch = [pillar.label, pillar.title, pillar.tagline, pillar.definition, pillar.keyRule]
        .some(s => s.toLowerCase().includes(q));
      if (pillarMatch) {
        results.push({ type: "pillar", pillar, id: pillar.id, title: `${pillar.label} — ${pillar.title}` });
      }

      // Match cross-refs
      pillar.crossRefs.forEach(ref => {
        if (ref.toLowerCase().includes(q)) {
          results.push({ type: "ref", pillar, id: pillar.id, title: `${ref} → referenced in ${pillar.label}` });
        }
      });

      // Match examples
      pillar.examples.forEach(ex => {
        if (ex.title.toLowerCase().includes(q) || ex.code.toLowerCase().includes(q)) {
          results.push({ type: "example", pillar, id: pillar.id, title: `${ex.title}`, subtitle: pillar.label });
        }
      });

      // Match anti-patterns
      pillar.antiPatterns.forEach(ap => {
        if (ap.id.toLowerCase().includes(q) || ap.name.toLowerCase().includes(q) || ap.bad.toLowerCase().includes(q) || ap.fix.toLowerCase().includes(q)) {
          results.push({ type: "anti-pattern", pillar, id: pillar.id, title: `⚠ ${ap.id}: ${ap.name}`, subtitle: pillar.label });
        }
      });

      // Match mechanism
      pillar.mechanism.forEach(m => {
        if (m.toLowerCase().includes(q)) {
          results.push({ type: "mechanism", pillar, id: pillar.id, title: `${m} → mechanism in ${pillar.label}` });
        }
      });
    });

    // Deduplicate by title
    const seen = new Set();
    return results.filter(r => {
      if (seen.has(r.title)) return false;
      seen.add(r.title);
      return true;
    }).slice(0, 12);
  }, [query]);
}


/* ════════════════════════════════════════════════════════════════════════════
   MAIN APP
   ════════════════════════════════════════════════════════════════════════════ */

export default function OOPFundamentals() {
  const [activeId, setActiveId] = useState("oop-encap");
  const [searchQuery, setSearchQuery] = useState("");
  const contentRef = useRef(null);
  const searchResults = useSearch(searchQuery);

  const scrollTo = useCallback((id) => {
    setSearchQuery("");
    setActiveId(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    PILLARS.forEach(p => {
      const el = document.getElementById(p.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="app-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@300;400;500;600;700&display=swap');

        /* ─── Reset & Root ─── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .app-root {
          --bg-0: #0c0e12;
          --bg-1: #12151b;
          --bg-2: #1a1e27;
          --bg-3: #232833;
          --bg-4: #2c3240;
          --border: #2a2f3b;
          --border-light: #353b4a;
          --text-0: #e8ecf4;
          --text-1: #b4bcd0;
          --text-2: #7e879c;
          --text-3: #545c6e;
          --accent-1: #e8a87c;
          --accent-2: #85cdca;
          --accent-3: #c49bde;
          --accent-4: #79b8ff;
          --red: #f87171;
          --green: #6ee7b7;
          --yellow: #fcd34d;
          --orange: #fb923c;

          /* syntax */
          --syn-keyword: #c49bde;
          --syn-string: #a5d6a7;
          --syn-comment: #545c6e;
          --syn-builtin: #79b8ff;
          --syn-decorator: #e8a87c;
          --syn-label: #85cdca;
          --syn-type: #fcd34d;

          display: flex;
          height: 100vh;
          background: var(--bg-0);
          color: var(--text-0);
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          line-height: 1.6;
          overflow: hidden;
        }

        /* ─── Sidebar ─── */
        .sidebar {
          width: 280px;
          min-width: 280px;
          background: var(--bg-1);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .sidebar-header {
          padding: 20px 20px 0;
        }

        .sidebar-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--text-2);
          margin-bottom: 4px;
        }

        .sidebar-heading {
          font-family: 'Outfit', sans-serif;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-0);
          margin-bottom: 16px;
          line-height: 1.3;
        }

        .sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: 8px 12px;
        }

        .nav-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
          margin-bottom: 2px;
        }

        .nav-item:hover {
          background: var(--bg-2);
          border-color: var(--border);
        }

        .nav-item.active {
          background: var(--bg-3);
          border-color: var(--border-light);
        }

        .nav-num {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          color: var(--text-3);
          min-width: 20px;
          padding-top: 3px;
        }

        .nav-item.active .nav-num { color: var(--accent-1); }

        .nav-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          font-weight: 500;
          color: var(--accent-2);
          letter-spacing: 0.05em;
        }

        .nav-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-1);
          line-height: 1.3;
        }

        .nav-item.active .nav-title { color: var(--text-0); }

        .nav-tagline {
          font-size: 11px;
          color: var(--text-3);
          margin-top: 2px;
        }

        /* Sidebar extras */
        .sidebar-section-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-3);
          padding: 16px 12px 6px;
        }

        .nav-extra {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          color: var(--text-2);
          transition: all 0.15s ease;
        }

        .nav-extra:hover {
          background: var(--bg-2);
          color: var(--text-1);
        }

        /* ─── Main Content ─── */
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .topbar {
          padding: 12px 32px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-1);
          display: flex;
          align-items: center;
          gap: 16px;
          position: relative;
        }

        /* ─── Search ─── */
        .search-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 6px 12px;
          flex: 1;
          max-width: 480px;
          transition: border-color 0.15s;
        }

        .search-bar:focus-within {
          border-color: var(--accent-2);
        }

        .search-icon {
          color: var(--text-3);
          font-size: 15px;
        }

        .search-bar input {
          background: none;
          border: none;
          outline: none;
          color: var(--text-0);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          flex: 1;
          width: 100%;
        }

        .search-bar input::placeholder {
          color: var(--text-3);
        }

        .search-clear {
          background: none;
          border: none;
          color: var(--text-3);
          cursor: pointer;
          font-size: 13px;
          padding: 2px 4px;
        }

        .search-clear:hover { color: var(--text-1); }

        .search-shortcut {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          color: var(--text-3);
          background: var(--bg-3);
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid var(--border);
        }

        /* Search results dropdown */
        .search-results {
          position: absolute;
          top: 100%;
          left: 32px;
          right: 32px;
          max-width: 520px;
          background: var(--bg-2);
          border: 1px solid var(--border-light);
          border-radius: 10px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.5);
          z-index: 100;
          max-height: 400px;
          overflow-y: auto;
          padding: 6px;
        }

        .search-result-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.1s;
        }

        .search-result-item:hover {
          background: var(--bg-3);
        }

        .sr-type {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--bg-0);
          background: var(--accent-2);
          padding: 2px 6px;
          border-radius: 3px;
          min-width: 50px;
          text-align: center;
        }

        .sr-type.anti-pattern { background: var(--orange); }
        .sr-type.example { background: var(--accent-3); }
        .sr-type.mechanism { background: var(--accent-4); }
        .sr-type.ref { background: var(--accent-1); }

        .sr-title {
          font-size: 13px;
          color: var(--text-0);
          font-family: 'IBM Plex Mono', monospace;
        }

        .sr-subtitle {
          font-size: 11px;
          color: var(--text-3);
          margin-left: auto;
        }

        .sr-empty {
          padding: 20px;
          text-align: center;
          color: var(--text-3);
          font-size: 13px;
        }

        /* ─── Content scroll area ─── */
        .content-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 32px 40px 80px;
          scroll-behavior: smooth;
        }

        .content-scroll::-webkit-scrollbar { width: 6px; }
        .content-scroll::-webkit-scrollbar-track { background: transparent; }
        .content-scroll::-webkit-scrollbar-thumb {
          background: var(--bg-4);
          border-radius: 3px;
        }

        /* ─── Pillar Section ─── */
        .pillar-section {
          margin-bottom: 56px;
          padding-bottom: 48px;
          border-bottom: 1px solid var(--border);
        }

        .pillar-section:last-of-type {
          border-bottom: none;
        }

        .pillar-header {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 24px;
        }

        .pillar-num {
          font-family: 'JetBrains Mono', monospace;
          font-size: 32px;
          font-weight: 700;
          color: var(--bg-4);
          line-height: 1;
          min-width: 48px;
        }

        .pillar-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          color: var(--accent-2);
          letter-spacing: 0.06em;
          margin-bottom: 4px;
        }

        .pillar-header h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: var(--text-0);
          line-height: 1.2;
        }

        .pillar-tagline {
          font-size: 14px;
          color: var(--text-2);
          margin-top: 4px;
          font-style: italic;
        }

        .pillar-def {
          background: var(--bg-2);
          border-left: 3px solid var(--accent-2);
          padding: 16px 20px;
          border-radius: 0 8px 8px 0;
          margin-bottom: 16px;
        }

        .pillar-def p {
          color: var(--text-1);
          font-size: 14px;
          line-height: 1.7;
        }

        /* Key rule */
        .key-rule {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 16px;
          background: rgba(232, 168, 124, 0.08);
          border: 1px solid rgba(232, 168, 124, 0.2);
          border-radius: 8px;
          margin-bottom: 16px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          color: var(--accent-1);
          line-height: 1.5;
        }

        .key-rule-icon {
          font-weight: 700;
          font-size: 15px;
          flex-shrink: 0;
        }

        /* Mechanism */
        .mechanism-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .mechanism-label, .refs-label, .approach-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-3);
          min-width: 90px;
          padding-top: 5px;
          flex-shrink: 0;
        }

        .mechanism-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .mech-tag {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          color: var(--text-1);
          background: var(--bg-2);
          border: 1px solid var(--border);
          padding: 3px 10px;
          border-radius: 4px;
        }

        /* Refs */
        .refs-row {
          display: flex;
          gap: 32px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .refs-row > div {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .refs-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .ref-tag {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          font-weight: 500;
          color: var(--accent-4);
          background: rgba(121, 184, 255, 0.1);
          border: 1px solid rgba(121, 184, 255, 0.2);
          padding: 2px 8px;
          border-radius: 4px;
          cursor: default;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .ref-tag:hover {
          background: rgba(121, 184, 255, 0.18);
          border-color: rgba(121, 184, 255, 0.35);
        }

        /* Default approach */
        .default-approach {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 20px;
          font-size: 13px;
          color: var(--text-1);
        }

        /* ─── Collapsible sections ─── */
        .collapsible-section {
          margin-bottom: 8px;
        }

        .collapsible-header {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 14px;
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-1);
          transition: all 0.15s;
          text-align: left;
        }

        .collapsible-header:hover {
          background: var(--bg-3);
          border-color: var(--border-light);
        }

        .ap-section-header {
          border-color: rgba(248, 113, 113, 0.15);
          background: rgba(248, 113, 113, 0.04);
        }

        .ap-section-header:hover {
          background: rgba(248, 113, 113, 0.08);
        }

        .tradeoff-header {
          border-color: rgba(133, 205, 202, 0.15);
          background: rgba(133, 205, 202, 0.04);
        }

        .tradeoff-header:hover {
          background: rgba(133, 205, 202, 0.08);
        }

        .td-approach {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--accent-2);
          white-space: nowrap;
        }

        .collapse-icon {
          color: var(--text-3);
          font-size: 12px;
          width: 14px;
        }

        .collapse-count {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: var(--text-3);
          background: var(--bg-3);
          padding: 1px 7px;
          border-radius: 10px;
          margin-left: auto;
        }

        .collapse-count.warn {
          color: var(--red);
          background: rgba(248, 113, 113, 0.1);
        }

        .collapsible-body {
          padding: 12px 0 4px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* ─── Example card ─── */
        .example-card {
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
        }

        .example-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 14px;
          background: var(--bg-2);
          border-bottom: 1px solid var(--border);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-1);
          gap: 8px;
          flex-wrap: wrap;
        }

        .example-refs {
          display: flex;
          gap: 4px;
        }

        /* ─── Code block ─── */
        .code-block {
          position: relative;
          background: var(--bg-0);
          border-radius: 0 0 8px 8px;
        }

        .example-card .code-block { border-radius: 0; }

        .code-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--text-3);
          padding: 8px 16px 0;
          letter-spacing: 0.05em;
        }

        .code-block pre {
          padding: 14px 16px;
          overflow-x: auto;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12.5px;
          line-height: 1.65;
          color: var(--text-1);
        }

        .code-block pre::-webkit-scrollbar { height: 4px; }
        .code-block pre::-webkit-scrollbar-thumb { background: var(--bg-4); border-radius: 2px; }

        .copy-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          background: var(--bg-3);
          border: 1px solid var(--border);
          color: var(--text-3);
          font-size: 14px;
          padding: 3px 7px;
          border-radius: 4px;
          cursor: pointer;
          opacity: 0;
          transition: all 0.15s;
          z-index: 2;
        }

        .code-block:hover .copy-btn { opacity: 1; }
        .copy-btn:hover { color: var(--text-0); background: var(--bg-4); }

        /* Syntax highlighting */
        .hl-keyword { color: var(--syn-keyword); }
        .hl-string { color: var(--syn-string); }
        .hl-comment { color: var(--syn-comment); font-style: italic; }
        .hl-builtin { color: var(--syn-builtin); }
        .hl-decorator { color: var(--syn-decorator); }
        .hl-label { color: var(--syn-label); font-weight: 500; }
        .hl-type { color: var(--syn-type); }

        /* ─── Anti-pattern card ─── */
        .ap-card {
          border: 1px solid rgba(248, 113, 113, 0.15);
          border-radius: 8px;
          overflow: hidden;
          background: rgba(248, 113, 113, 0.02);
        }

        .ap-header {
          padding: 12px 16px 8px;
        }

        .ap-badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          color: var(--orange);
          letter-spacing: 0.04em;
          margin-bottom: 4px;
        }

        .ap-header h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-0);
          margin-bottom: 2px;
        }

        .ap-symptom {
          font-size: 12px;
          color: var(--text-2);
          font-style: italic;
        }

        .ap-toggle-bar {
          display: flex;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }

        .ap-toggle-btn {
          flex: 1;
          padding: 6px 12px;
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          color: var(--text-3);
          transition: all 0.15s;
        }

        .ap-toggle-btn:first-child {
          border-right: 1px solid var(--border);
        }

        .ap-toggle-btn.active {
          background: var(--bg-2);
        }

        .ap-toggle-btn:first-child.active {
          color: var(--red);
        }

        .ap-toggle-btn:last-child.active {
          color: var(--green);
        }

        .ap-toggle-btn:hover {
          background: var(--bg-3);
        }

        /* ─── Quick-ref table ─── */
        .qr-section {
          margin-top: 16px;
        }

        .table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        th {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-3);
          background: var(--bg-2);
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }

        td {
          padding: 10px 12px;
          color: var(--text-1);
          border-bottom: 1px solid var(--border);
          vertical-align: top;
          line-height: 1.5;
        }

        tr:hover td {
          background: rgba(133, 205, 202, 0.03);
        }

        /* ─── Section page header ─── */
        .page-header {
          margin-bottom: 40px;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--border);
        }

        .page-breadcrumb {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: var(--text-3);
          letter-spacing: 0.08em;
          margin-bottom: 8px;
        }

        .page-breadcrumb span { color: var(--accent-2); }

        .page-title {
          font-size: 32px;
          font-weight: 700;
          color: var(--text-0);
          line-height: 1.2;
          margin-bottom: 6px;
        }

        .page-subtitle {
          font-size: 15px;
          color: var(--text-2);
          max-width: 600px;
        }

        .pillar-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-top: 20px;
        }

        .pillar-card {
          padding: 12px 14px;
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pillar-card:hover {
          border-color: var(--accent-2);
          transform: translateY(-1px);
        }

        .pc-num {
          font-family: 'JetBrains Mono', monospace;
          font-size: 20px;
          font-weight: 700;
          color: var(--bg-4);
        }

        .pc-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-0);
          margin-top: 4px;
        }

        .pc-count {
          font-size: 11px;
          color: var(--text-3);
          margin-top: 2px;
        }

        /* ─── Decision Tree Diagram ─── */
        .dt-diagram {
          background: var(--bg-1);
          border: 1px solid var(--border);
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 40px;
        }

        .dt-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-2);
        }

        .dt-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          color: var(--accent-3);
          background: rgba(196,155,222,0.1);
          border: 1px solid rgba(196,155,222,0.2);
          padding: 2px 8px;
          border-radius: 4px;
          letter-spacing: 0.05em;
        }

        .dt-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-0);
        }

        .dt-tabs {
          display: flex;
          gap: 2px;
          padding: 10px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-1);
        }

        .dt-tab {
          padding: 5px 14px;
          border-radius: 6px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          font-weight: 500;
          color: var(--text-3);
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s;
        }

        .dt-tab:hover {
          color: var(--text-1);
          background: var(--bg-2);
        }

        .dt-tab.active {
          background: var(--bg-3);
          border-color: var(--border-light);
        }

        .dt-canvas {
          padding: 16px;
          min-height: 200px;
        }

        .dt-canvas svg {
          max-width: 100%;
        }

        .dia-clickable { cursor: pointer; }
        .dia-clickable:hover rect {
          filter: brightness(1.2);
        }

        .dia-node text {
          user-select: none;
          pointer-events: none;
        }

        /* ─── Animations ─── */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .pillar-section {
          animation: fadeIn 0.3s ease both;
        }

        .search-results {
          animation: fadeIn 0.15s ease;
        }

        /* ─── Scrollbar in sidebar ─── */
        .sidebar-nav::-webkit-scrollbar { width: 4px; }
        .sidebar-nav::-webkit-scrollbar-track { background: transparent; }
        .sidebar-nav::-webkit-scrollbar-thumb { background: var(--bg-4); border-radius: 2px; }
      `}</style>

      {/* ─── Sidebar ─── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">Python TDD & OOP Guide</div>
          <div className="sidebar-heading">OOP Fundamentals</div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">The Four Pillars</div>
          {PILLARS.map(p => (
            <div
              key={p.id}
              className={`nav-item ${activeId === p.id ? "active" : ""}`}
              onClick={() => scrollTo(p.id)}
            >
              <div className="nav-num">{p.num}</div>
              <div>
                <div className="nav-label">{p.label}</div>
                <div className="nav-title">{p.title}</div>
                <div className="nav-tagline">{p.tagline}</div>
              </div>
            </div>
          ))}

          <div className="sidebar-section-label">Reference</div>
          <div className="nav-extra" onClick={() => scrollTo("dt-oop-1")}>
            <span>◇</span> DT-OOP-1 Decision Tree
          </div>
          <div className="nav-extra" onClick={() => scrollTo("quick-ref")}>
            <span>◫</span> Pillar Quick-Reference Matrix
          </div>
          <div className="nav-extra" onClick={() => scrollTo("solid-crossmap")}>
            <span>◫</span> SOLID ↔ OOP Cross-Map
          </div>
        </nav>
      </aside>

      {/* ─── Main ─── */}
      <main className="main-content">
        <div className="topbar">
          <SearchBar query={searchQuery} setQuery={setSearchQuery} />

          {/* Search results dropdown */}
          {searchResults && (
            <div className="search-results">
              {searchResults.length === 0 ? (
                <div className="sr-empty">No matches for "{searchQuery}"</div>
              ) : (
                searchResults.map((r, i) => (
                  <div key={i} className="search-result-item" onClick={() => scrollTo(r.id)}>
                    <span className={`sr-type ${r.type}`}>{r.type.replace("-", " ")}</span>
                    <span className="sr-title">{r.title}</span>
                    {r.subtitle && <span className="sr-subtitle">{r.subtitle}</span>}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="content-scroll" ref={contentRef}>
          {/* Page header */}
          <div className="page-header">
            <div className="page-breadcrumb">guide / <span>oop-fundamentals</span></div>
            <h1 className="page-title">The Four Pillars</h1>
            <p className="page-subtitle">
              Every pattern in this guide implements one or more of these four principles.
              Each pillar maps to existing labels, provides trade-off analysis, and catalogues anti-patterns.
            </p>
            <div className="pillar-cards">
              {PILLARS.map(p => (
                <div key={p.id} className="pillar-card" onClick={() => scrollTo(p.id)}>
                  <div className="pc-num">{p.num}</div>
                  <div className="pc-title">{p.title}</div>
                  <div className="pc-count">
                    {p.examples.length} examples · {p.antiPatterns.length} anti-patterns
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Decision Tree Diagram */}
          <DecisionTreeDiagram scrollTo={scrollTo} />

          {/* Pillar sections */}
          {PILLARS.map(p => (
            <PillarSection key={p.id} pillar={p} isActive={activeId === p.id} />
          ))}

          {/* Quick reference tables */}
          <QuickRefTable data={QUICK_REF} />

          <div id="solid-crossmap">
            <QuickRefTable data={SOLID_CROSSMAP} />
          </div>
        </div>
      </main>
    </div>
  );
}
