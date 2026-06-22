const state = {
  ingredients: [],
  medications: [],
  products: [],
  rules: [],
};

const nodes = {};

document.addEventListener("DOMContentLoaded", async () => {
  bindNodes();
  bindEvents();
  await loadData();
  seedExample();
  analyze();
});

function bindNodes() {
  nodes.productName = document.getElementById("product-name");
  nodes.ingredientInput = document.getElementById("ingredient-input");
  nodes.medInput = document.getElementById("med-input");
  nodes.analyze = document.getElementById("analyze");
  nodes.loadExample = document.getElementById("load-example");
  nodes.clearForm = document.getElementById("clear-form");
  nodes.summary = document.getElementById("summary");
  nodes.ingredientList = document.getElementById("ingredient-list");
  nodes.warnings = document.getElementById("warnings");
  nodes.message = document.getElementById("message");
  nodes.riskBadge = document.getElementById("risk-badge");
  nodes.context = [...document.querySelectorAll('input[type="checkbox"]')];
}

function bindEvents() {
  nodes.analyze.addEventListener("click", analyze);
  nodes.loadExample.addEventListener("click", () => {
    seedExample();
    analyze();
  });
  nodes.clearForm.addEventListener("click", () => {
    nodes.productName.value = "";
    nodes.ingredientInput.value = "";
    nodes.medInput.value = "";
    nodes.context.forEach((box) => {
      box.checked = false;
    });
    analyze();
  });
}

async function loadData() {
  const [ingredients, medications, products, rules] = await Promise.all([
    loadJson("data/ingredients.json"),
    loadJson("data/medications.json"),
    loadJson("data/products.json"),
    loadJson("data/interaction_rules.json"),
  ]);

  state.ingredients = ingredients;
  state.medications = medications;
  state.products = products;
  state.rules = rules;
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
}

function seedExample() {
  nodes.productName.value = "Nidramap";
  nodes.ingredientInput.value = "";
  nodes.medInput.value = "lithium\nmirtazapine";
  setContext(["mood_history"]);
}

function setContext(values) {
  const lookup = new Set(values);
  nodes.context.forEach((box) => {
    box.checked = lookup.has(box.value);
  });
}

function analyze() {
  const productName = nodes.productName.value.trim();
  const manualIngredients = splitList(nodes.ingredientInput.value);
  const medications = splitList(nodes.medInput.value);
  const context = nodes.context.filter((box) => box.checked).map((box) => box.value);

  const product = findProduct(productName);
  const ingredientRecords = uniqueById([
    ...manualIngredients.map(resolveIngredientRecord),
    ...(product?.ingredients || []).map((id) => state.ingredients.find((item) => item.id === id)).filter(Boolean),
  ]);
  const medicationRecords = medications.map(resolveMedication).filter(Boolean);
  const warnings = matchRules({ product, ingredientRecords, medicationRecords, context });

  renderSummary(product, ingredientRecords, medicationRecords, context, warnings);
  renderIngredients(ingredientRecords);
  renderWarnings(warnings);
  renderMessage(product, ingredientRecords, medicationRecords);
}

function splitList(value) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findProduct(name) {
  const target = normalize(name);
  return state.products.find((product) => normalize(product.name) === target || normalize(product.id) === target);
}

function resolveIngredientRecord(name) {
  const target = normalize(name);
  const found = state.ingredients.find(
    (ingredient) =>
      normalize(ingredient.id) === target || ingredient.names.some((alias) => normalize(alias) === target),
  );
  return (
    found || {
      id: target.replace(/\s+/g, "_"),
      names: [name],
      system: "Unmapped",
      effects: [],
      cautions: [],
    }
  );
}

function resolveMedication(name) {
  const target = normalize(name);
  return state.medications.find(
    (medication) =>
      normalize(medication.id) === target || medication.names.some((alias) => normalize(alias) === target),
  );
}

function matchRules({ product, ingredientRecords, medicationRecords, context }) {
  const warnings = [];
  const ingredientIds = new Set(ingredientRecords.map((item) => item.id));
  const medicationIds = new Set(medicationRecords.map((item) => item.id));
  const medicationCategories = new Set(medicationRecords.flatMap((item) => item.categories));
  const effects = new Set([
    ...ingredientRecords.flatMap((item) => item.effects || []),
    ...medicationRecords.flatMap((item) => item.flags || []),
    ...context,
  ]);
  const cautions = new Set(ingredientRecords.flatMap((item) => item.cautions || []));

  for (const rule of state.rules) {
    const conditions = rule.if || {};
    const ingredientMatch = !conditions.ingredient || ingredientIds.has(conditions.ingredient);
    const ingredientAnyMatch =
      !conditions.ingredient_any || conditions.ingredient_any.some((id) => ingredientIds.has(id));
    const medicationMatch = !conditions.medication || medicationIds.has(conditions.medication);
    const medicationCategoryMatch =
      !conditions.medication_category || medicationCategories.has(conditions.medication_category);
    const effectAnyMatch = !conditions.effect_any || conditions.effect_any.some((effect) => effects.has(effect));
    const cautionAnyMatch = !conditions.caution_any || conditions.caution_any.some((caution) => cautions.has(caution));
    const contextMatch = !conditions.context || context.includes(conditions.context);
    const productMatch = !conditions.product || product?.id === conditions.product;

    if (
      ingredientMatch &&
      ingredientAnyMatch &&
      medicationMatch &&
      medicationCategoryMatch &&
      effectAnyMatch &&
      cautionAnyMatch &&
      contextMatch &&
      productMatch
    ) {
      warnings.push(rule);
    }
  }

  if (product && product.notes) {
    warnings.push({
      id: `${product.id}_uncertainty`,
      risk_level: "Unclear / Insufficient Evidence",
      message: product.notes,
      why: "Formulation details can vary by product listing and batch.",
      what_to_ask: "Confirm the exact ingredient list and extract strength with the seller or pharmacist.",
    });
  }

  if (ingredientRecords.length > 1) {
    warnings.push({
      id: "multi_ingredient",
      risk_level: "Unclear / Insufficient Evidence",
      message: "Multi-ingredient formulas add uncertainty because interactions can stack and extract strength varies.",
      why: "The combined effect can be stronger or different from any single ingredient.",
      what_to_ask: "Ask a pharmacist or clinician to review the full formula, not just the headline product name.",
    });
  }

  return warnings.sort((a, b) => riskRank(b.risk_level) - riskRank(a.risk_level));
}

function riskRank(level) {
  return {
    "Known Risk": 4,
    "Known / Possible Risk": 4,
    "Possible Risk": 3,
    "Unclear / Insufficient Evidence": 2,
    "No obvious known issue, but not clearance": 1,
  }[level] || 0;
}

function renderSummary(product, ingredientRecords, medicationRecords, context, warnings) {
  const totalRisk = warnings.reduce((highest, warning) => Math.max(highest, riskRank(warning.risk_level)), 0);
  const badgeMap = {
    4: ["high", "Known risk"],
    3: ["medium", "Possible risk"],
    2: ["medium", "Unclear evidence"],
    1: ["low", "No obvious issue, not clearance"],
    0: ["low", "No matches yet"],
  };
  const [badgeClass, badgeText] = badgeMap[totalRisk];
  nodes.riskBadge.className = `badge ${badgeClass}`;
  nodes.riskBadge.textContent = badgeText;

  const items = [
    {
      title: "Product",
      body: product ? `${product.name} · ${product.category}` : "No known product match yet.",
    },
    {
      title: "Ingredients",
      body: ingredientRecords.length
        ? ingredientRecords.map((item) => item.names[0]).join(", ")
        : "Add a product or ingredient list to see the breakdown.",
    },
    {
      title: "Medications and context",
      body: [
        medicationRecords.length ? medicationRecords.map((item) => item.names[0]).join(", ") : "No medications entered.",
        context.length ? `Context flags: ${context.join(", ")}` : "No health context flags set.",
      ].join(" "),
    },
  ];

  nodes.summary.innerHTML = items
    .map(
      (item) => `
        <article class="summary-item">
          <strong>${item.title}</strong>
          <p>${escapeHtml(item.body)}</p>
        </article>
      `,
    )
    .join("");
}

function renderIngredients(ingredientRecords) {
  if (!ingredientRecords.length) {
    nodes.ingredientList.innerHTML = '<span class="chip">No ingredient match yet</span>';
    return;
  }

  nodes.ingredientList.innerHTML = ingredientRecords
    .map((item) => `<span class="chip">${escapeHtml(item.names[0])} · ${escapeHtml(item.system)}</span>`)
    .join("");
}

function renderWarnings(warnings) {
  if (!warnings.length) {
    nodes.warnings.innerHTML = `
      <article class="warning">
        <strong>No obvious known issue, but not clearance</strong>
        <p>Enter a product or ingredient list to surface interaction questions and uncertainty.</p>
      </article>
    `;
    return;
  }

  nodes.warnings.innerHTML = warnings
    .map(
      (warning) => `
        <article class="warning">
          <strong>${escapeHtml(warning.risk_level)}</strong>
          <p>${escapeHtml(warning.message)}</p>
          ${
            warning.why
              ? `<p><strong>Why this matters:</strong> ${escapeHtml(warning.why)}</p>`
              : ""
          }
          ${
            warning.what_to_ask
              ? `<p><strong>Ask:</strong> ${escapeHtml(warning.what_to_ask)}</p>`
              : ""
          }
        </article>
      `,
    )
    .join("");
}

function renderMessage(product, ingredientRecords, medicationRecords) {
  const productName = product?.name || nodes.productName.value.trim() || "the product";
  const ingredientText = ingredientRecords.length
    ? ingredientRecords.map((item) => item.names[0]).join(", ")
    : "the listed ingredients";
  const medicationText = medicationRecords.length
    ? medicationRecords.map((item) => item.names[0]).join(", ")
    : "my current medications";

  nodes.message.value = `Hi, I’m considering taking ${productName} daily. It contains ${ingredientText}. I currently take ${medicationText}. Could you check for interactions, especially sedation, liver/kidney concerns, lithium-related issues, and mood destabilisation risk?`;
}

function uniqueById(records) {
  const map = new Map();
  for (const record of records) {
    map.set(record.id, record);
  }
  return [...map.values()];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
