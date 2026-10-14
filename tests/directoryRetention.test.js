import assert from "node:assert/strict";
import { test } from "node:test";
import { directoryForPlan, preserveHiddenDirectoryContent } from "../src/lib/directoryPlanVisibility.js";
const saved = {
  id: 1, description: Array.from({ length: 1100 }, (_, i) => "word" + i).join(" "),
  coverImageUrl: ["cover1", "cover2", "cover3"],
  companyGallery: ["company1"], factoryGallery: ["factory1"],
  productGallery: Array.from({ length: 18 }, (_, i) => ({ image: "product" + i, name: "name" + i, description: "description" + i })),
  productSupplies: Array.from({ length: 12 }, (_, i) => "product" + i),
  socialLinks: { whatsapp: "saved-whatsapp", linkedin: "link" },
  companyBrochure: ["saved.pdf"], certifications: ["certificate.pdf"], exportMarkets: ["market"],
  manufacturingCapabilities: "<p>saved capabilities</p>", manufacturingCapabilityImages: ["machine.png"],
  manufacturingCapabilityVideos: ["video"], machineryList: "saved list", machineryImages: ["image"],
  qualityStandards: "ISO", enableInquiryForm: true,
};
test("Free responses hide premium data and limit arrays without changing the original row", () => {
  const before = structuredClone(saved);
  const visible = directoryForPlan(saved, "free");
  assert.equal(visible.hiddenSavedContent, true);
  assert.equal(visible.description.split(" ").length, 150);
  assert.equal(visible.productSupplies.length, 5);
  assert.equal(visible.productGallery.length, 10);
  assert.deepEqual(visible.companyGallery, []);
  assert.deepEqual(visible.coverImageUrl, []);
  assert.equal(visible.socialLinks.whatsapp, undefined);
  assert.equal(visible.manufacturingCapabilities, null);
  assert.equal(visible.enableInquiryForm, false);
  assert.deepEqual(saved, before);
});
test("saving the reduced Free editor retains premium fields, images and hidden word/array tails", () => {
  const visible = directoryForPlan(saved, "free");
  const update = { description: "edited", productSupplies: ["edited product"], productGallery: visible.productGallery.slice(0,2), companyGallery: [], coverImageUrl: [], companyBrochure: [], manufacturingCapabilities: null, qualityStandards: null, socialLinks: { linkedin: "new link" }, enableInquiryForm: true };
  const changed = { ...saved, ...preserveHiddenDirectoryContent(saved, update, "free") };
  assert.deepEqual(changed.companyGallery, saved.companyGallery);
  assert.deepEqual(changed.coverImageUrl, saved.coverImageUrl);
  assert.deepEqual(changed.companyBrochure, saved.companyBrochure);
  assert.equal(changed.manufacturingCapabilities, saved.manufacturingCapabilities);
  assert.equal(changed.qualityStandards, saved.qualityStandards);
  assert.equal(changed.enableInquiryForm, true);
  assert.equal(changed.socialLinks.whatsapp, saved.socialLinks.whatsapp);
  assert.deepEqual(changed.productSupplies.slice(1), saved.productSupplies.slice(5));
  assert.deepEqual(changed.productGallery.slice(2), saved.productGallery.slice(10));
  assert.equal(changed.description, ["edited", ...saved.description.split(" ").slice(150)].join(" "));
  const renewed = directoryForPlan(changed, "enterprise");
  assert.deepEqual(renewed.companyBrochure, saved.companyBrochure);
  assert.deepEqual(renewed.productGallery, changed.productGallery);
});
test("plan limits reject extra new uploads instead of truncating them", () => {
  assert.throws(() => preserveHiddenDirectoryContent(saved, { productGallery: saved.productGallery }, "free"), { code: "PACKAGE_LIMIT_EXCEEDED" });
  assert.throws(() => preserveHiddenDirectoryContent(saved, { description: saved.description }, "free"), { code: "PACKAGE_LIMIT_EXCEEDED" });
});
test("a lower paid plan restores only its allowances while retaining the rest", () => {
  const basic = directoryForPlan(saved, "basic");
  assert.equal(basic.coverImageUrl.length, 1);
  assert.equal(basic.description.split(" ").length, 1000);
  assert.equal(basic.manufacturingCapabilityImages.length, 0);
  assert.deepEqual(basic.companyBrochure, saved.companyBrochure);
  const persisted = { ...saved, ...preserveHiddenDirectoryContent(saved, { coverImageUrl: ["newcover"], manufacturingCapabilityImages: [] }, "basic") };
  assert.deepEqual(persisted.coverImageUrl, ["newcover", "cover2", "cover3"]);
  assert.deepEqual(directoryForPlan(persisted, "enterprise").manufacturingCapabilityImages, saved.manufacturingCapabilityImages);
});

test("homepage promotion is hidden on Free while its saved setting remains available on renewal", () => {
  const row = { ...saved, isFeatured: true };
  assert.equal(directoryForPlan(row, "free").isFeatured, false);
  assert.equal(directoryForPlan(row, "professional").isFeatured, true);
  assert.equal(row.isFeatured, true);
});
