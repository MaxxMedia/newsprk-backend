// import prisma from "../src/prismaClient.js";
// import slugify from "slugify";

// /* ======================================
//    🔁 Recursive Insert Function
// ====================================== */

// async function createIndustryTree(data, parentId = null) {
//   for (const item of data) {
//     const slug = slugify(item.name, { lower: true, strict: true });

//     const created = await prisma.industry.create({
//       data: {
//         name: item.name,
//         slug: slug + "-" + Date.now() + Math.floor(Math.random() * 1000),
//         parentId,
//       },
//     });

//     if (item.children && item.children.length > 0) {
//       await createIndustryTree(item.children, created.id);
//     }
//   }
// }

// /* ======================================
//    📦 Your Top-Level Categories
// ====================================== */

// const industries = [
//   { name: "Additive Manufacturing" },
//   { name: "Automation & AI" },
//   { name: "Business Development" },
//   { name: "Cleaning & Pretreatment" },
//   { name: "Composites Fabrication" },
//   { name: "Inspection, Testing, Measurement" },
//   { name: "Manufacturing Execution & Automation Software & Controls" },
//   { name: "Manufacturing Services" },
//   { name: "Materials" },
//   { name: "Metalworking" },
//   { name: "Mould Making" },
//   { name: "Plastics Processing Equipment" },
//   { name: "Pollution Control & Sustainability" },
//   { name: "Suppliers" },
//   { name: "Surface Finishing" },
//   { name: "Temperature/Pressure Control Equipment" },
//   { name: "Workholding" },
// ];

// /* ======================================
//    🚀 RUN
// ====================================== */

// async function main() {
//   console.log("Seeding industries...");
//   await createIndustryTree(industries);
//   console.log("Done!");
// }

// main()
//   .catch(console.error)
//   .finally(() => prisma.$disconnect());


import prisma from "../src/prismaClient.js";
import slugify from "slugify";

/* ======================================
   🔁 Recursive Insert Function
====================================== */
function industryKey(name, parentId) {
  return `${parentId ?? "root"}::${String(name).trim().toLowerCase()}`;
}

async function createIndustryTree(data) {
  const existing = await prisma.industry.findMany({
    select: { id: true, name: true, parentId: true, slug: true },
  });

  const byParentAndName = new Map(
    existing.map((row) => [industryKey(row.name, row.parentId), row])
  );
  const usedSlugs = new Set(existing.map((row) => row.slug));

  let createdCount = 0;
  let skippedCount = 0;

  async function walk(nodes, parentId = null) {
    for (const item of nodes) {
      const name = String(item.name || "").trim();
      if (!name) continue;

      const key = industryKey(name, parentId);
      let row = byParentAndName.get(key);

      if (!row) {
        let slug = slugify(name, { lower: true, strict: true }) || "industry";
        let candidate = slug;
        let suffix = 2;
        while (usedSlugs.has(candidate)) {
          candidate = `${slug}-${suffix++}`;
        }
        usedSlugs.add(candidate);

        row = await prisma.industry.create({
          data: { name, slug: candidate, parentId },
        });
        byParentAndName.set(key, row);
        createdCount += 1;
      } else {
        skippedCount += 1;
      }

      if (item.children && item.children.length > 0) {
        await walk(item.children, row.id);
      }
    }
  }

  await walk(data, null);
  return { createdCount, skippedCount };
}

/* ======================================
   📦 FULL INDUSTRY TREE
====================================== */
const industries = [
  {
    name: "Additive Manufacturing",
    children: [
      {
        name: "Additive Manufacturing Machines (By Material)",
        children: [
          {
            name: "for Ceramic Parts",
          },
          {
            name: "for Composite Parts",
            children: [
              {
                name: "Continuous Fiber/Thermoplastic Resin",
              },
              {
                name: "Continuous Fiber/Thermoset Resin",
              },
              {
                name: "Discontinuous Fiber/Thermoplastic Resin",
              },
              {
                name: "Discontinuous Fiber/Thermoset Resin",
              },
            ],
          },
          {
            name: "for Metal Parts",
          },
          {
            name: "for Polymer Parts",
          },
        ],
      },
      {
        name: "Additive Manufacturing Machines (By Process)",
        children: [
          {
            name: "Binder Jetting",
          },
          {
            name: "Hybrid AM Machines",
          },
          {
            name: "Material Jetting",
          },
          {
            name: "Powder Bed Fusion",
          },
          {
            name: "Sheet Lamination",
          },
          {
            name: "Vat Polymerization",
          },
        ],
      },
      {
        name: "Additive Manufacturing/3D Printing Services",
        children: [
          {
            name: "Large Format",
          },
          {
            name: "Small Format",
          },
        ],
      },
      {
        name: "Material Handling Equipment",
      },
      {
        name: "Materials for Additive Manufacturing",
        children: [
          {
            name: "Ceramics",
          },
          {
            name: "Composites",
            children: [
              {
                name: "Continuous Fiber/Thermoplastic Resin",
              },
              {
                name: "Continuous Fiber/Thermoset Resin",
              },
              {
                name: "Discontinuous Fiber/Thermoplastic Resin",
              },
              {
                name: "Discontinuous Fiber/Thermoset Resin",
              },
            ],
          },
          {
            name: "Metal",
          },
          {
            name: "Polymer",
          },
        ],
      },
      {
        name: "Part & Tooling Production Services",
      },
      {
        name: "Postprocessing Equipment",
      },
      {
        name: "Safety Equipment for Additive Manufacturing",
      },
      {
        name: "Software for Additive Manufacturing",
        children: [
          {
            name: "Job & File Management Software",
          },
          {
            name: "Part Design Software",
          },
        ],
      },
      {
        name: "Training & Consultancy for Additive Manufacturing",
      },
    ],
  },
  {
    name: "Automation & AI",
    children: [
      {
        name: "AI & Machine Learning Solutions",
        children: [
          {
            name: "AI for Supply Chain Optimization (ie: Routing, Supplier Selection)",
          },
          {
            name: "AI-Powered Quality Control Systems",
          },
          {
            name: "Condition Monitoring Equipment (Vibration Monitoring, Thermal Imaging)",
          },
          {
            name: "Machine Learning Platforms for Manufacturing",
          },
        ],
      },
      {
        name: "AI-Enabled Predictive Maintenance & Asset Management",
        children: [
          {
            name: "IoT-enabled Maintenance Tools",
            children: [
              {
                name: "IoT Maintenance Alerts",
              },
              {
                name: "Smart Sensors for Predictive Maintenance",
              },
            ],
          },
          {
            name: "Predictive Maintenance Software",
            children: [
              {
                name: "Machine Learning for Maintenance Prediction",
              },
              {
                name: "Sensor Data Analysis Tools",
              },
            ],
          },
        ],
      },
      {
        name: "Augmented & Virtual Reality Systems",
        children: [
          {
            name: "AR Software for Remote Assistance",
          },
          {
            name: "AR/VR Headsets for Manufacturing",
          },
          {
            name: "VR Training Simulators",
          },
        ],
      },
      {
        name: "Digital Twin Software",
        children: [
          {
            name: "Digital Twin Creation Software (CAD Integration, Data Sync)",
          },
          {
            name: "Digital Twin Maintenance & Monitoring Services",
          },
          {
            name: "IoT Platforms for Digital Twin Integration",
          },
          {
            name: "Simulation Software for Digital Twins",
          },
        ],
      },
      {
        name: "Edge Computing & IoT Devices",
        children: [
          {
            name: "Data Management & Visualization",
          },
          {
            name: "Edge Computing Hardware, Servers, PCs",
          },
          {
            name: "IIoT Gateways (Wireless, Cellular)",
          },
          {
            name: "Industrial IoT Sensors",
            children: [
              {
                name: "Environmental Sensors",
              },
              {
                name: "Pressure Sensors",
              },
              {
                name: "Temperature Sensors",
              },
              {
                name: "Vibration Sensors",
              },
            ],
          },
        ],
      },
      {
        name: "Materials Handling",
        children: [
          {
            name: "Bag & Drum Handling",
          },
          {
            name: "Box Tilters",
          },
          {
            name: "Composites Materials Handling",
          },
          {
            name: "Conveying Equipment (Pneumatic & Mechanical)",
          },
          {
            name: "Drums (and Accessories - Liners, Warmers, Pumps etc.)",
          },
          {
            name: "Plastics Materials Handling",
            children: [
              {
                name: "Dessicant for Dryers",
              },
              {
                name: "Dryers for Resins",
              },
              {
                name: "Feeders",
              },
              {
                name: "Hopper Loaders",
              },
              {
                name: "Hoppers, Bins, Tanks",
              },
              {
                name: "Metal Detectors, Separators",
              },
              {
                name: "Metering, Proportioning Equipment",
              },
              {
                name: "Semi-bulk Containers",
              },
              {
                name: "Silos",
              },
              {
                name: "Valves, Gates, Diverters",
              },
              {
                name: "Weigh Scales",
              },
            ],
          },
          {
            name: "Tanks",
            children: [
              {
                name: "Accessories (Magnets, Covers, Linings)",
              },
              {
                name: "Metal",
              },
              {
                name: "Plastic",
              },
            ],
          },
        ],
      },
      {
        name: "Robots",
        children: [
          {
            name: "Articulated Robots",
          },
          {
            name: "Cartesian Robots",
          },
          {
            name: "Collaborative Robots (Cobots)",
            children: [
              {
                name: "High-Payload Cobots",
              },
              {
                name: "Lightweight Cobots for Assembly",
              },
            ],
          },
          {
            name: "SCARA Robots",
          },
        ],
      },
      {
        name: "Simulation & Generative Design",
        children: [
          {
            name: "Generative Design Software",
          },
          {
            name: "Modeling/Simulation/Virtual Testing Software",
          },
        ],
      },
      {
        name: "Work Handling",
        children: [
          {
            name: "All Other Workpiece Handling, Loading & Feeding Equipment",
          },
          {
            name: "Automated Guided Vehicles (AGVs)",
          },
          {
            name: "Bar Feed Mechanisms",
          },
          {
            name: "Bowl Feeders",
          },
          {
            name: "Conveyors & Other Part Handling Automation",
          },
          {
            name: "Gantry Loaders",
          },
          {
            name: "Lifting & Positioning Equipment",
          },
          {
            name: "Loading/Unloading Systems",
          },
          {
            name: "Pallet Changers, Shuttles & Programmable Transfer",
          },
          {
            name: "Parts Running, Separating, Orienting",
          },
          {
            name: "Racks & Clamps for Plating, Painting & Anodizing",
            children: [
              {
                name: "Anodizing Rack Components",
              },
              {
                name: "Clamps",
              },
              {
                name: "Plating Rack Coatings",
              },
              {
                name: "Rack Trucks",
              },
              {
                name: "Racking/Unracking Machines",
              },
              {
                name: "Titanium Racks, Baskets",
              },
            ],
          },
          {
            name: "Robot Tooling/Grippers",
          },
        ],
      },
    ],
  },
  {
    name: "Business Development",
    children: [
      {
        name: "Books, Pulications, Online Resources",
      },
      {
        name: "Business Insurance Products",
        children: [
          {
            name: "Cyber Insurance for Manufacturing",
          },
          {
            name: "Equipment Breakdown Insurance",
          },
          {
            name: "Liability Insurance for Industrial Operations",
          },
          {
            name: "Manufacturing Business Insurance",
          },
        ],
      },
      {
        name: "Conference & Exhibition Organizers",
      },
      {
        name: "Consulting Services",
        children: [
          {
            name: "Additive Manufacturing Consulting",
          },
          {
            name: "Business Development & Acquisition",
          },
          {
            name: "Composites",
            children: [
              {
                name: "Composites Materials",
              },
              {
                name: "Composites Process Development",
              },
              {
                name: "Composites Structural Design",
              },
              {
                name: "Other",
              },
              {
                name: "Procurement/Purchasing/Specification",
              },
            ],
          },
          {
            name: "Digital Transformation Services (IOT, AI Integration)",
          },
          {
            name: "EH&S Consulting",
            children: [
              {
                name: "Environmental",
              },
              {
                name: "Health & Safety",
              },
            ],
          },
          {
            name: "Lean Manufacturing Consulting",
          },
          {
            name: "Metalworking",
          },
          {
            name: "Moldmaking & Repair",
          },
          {
            name: "Plastics Processing  - Design, Manufacturing, Purchasing",
          },
          {
            name: "R&D Institutes, Labs",
          },
          {
            name: "Surface Finishing Consulting",
            children: [
              {
                name: "Aluminum Finishing",
              },
              {
                name: "Buffing/Polishing",
              },
              {
                name: "Electroplating/Electroless Plating",
              },
              {
                name: "Mass Finishing",
              },
              {
                name: "Organic Finishing",
              },
              {
                name: "Paint Pretreatment",
              },
              {
                name: "Parts Cleaning",
              },
              {
                name: "Powder Coating",
              },
            ],
          },
        ],
      },
      {
        name: "Cybersecurity Solutions for Manufacturing",
        children: [
          {
            name: "Data Encryption Solutions",
          },
          {
            name: "Industrial Cybersecurity Software",
          },
          {
            name: "IoT Security Devices",
          },
          {
            name: "Network Security for OT",
          },
        ],
      },
      {
        name: "Industry Data",
      },
      {
        name: "Leasing & Financing Services",
        children: [
          {
            name: "Capital Equipment Financing",
          },
          {
            name: "Equipment Purchase Financing",
          },
          {
            name: "Flexible Repayment Options",
          },
          {
            name: "Invoice Financing",
          },
          {
            name: "Long-Term Leasing",
          },
          {
            name: "Manufacturing Loans",
          },
          {
            name: "Short-Term Leasing",
          },
          {
            name: "Specialized Machinery Loans",
          },
          {
            name: "Upgrade & Modernization Loans",
          },
        ],
      },
      {
        name: "Market Research",
      },
      {
        name: "Online Sourcing/Prospecting Services",
      },
      {
        name: "Recruitment & Placement Services",
      },
      {
        name: "Shipping & Logistics",
      },
      {
        name: "Supply Chain & Reshoring Tools",
        children: [
          {
            name: "Local Manufacturing Support Software",
          },
          {
            name: "Reshoring Analysis Tools",
          },
          {
            name: "Risk Management Software for Supply Chains",
          },
          {
            name: "Supply Chain Visibility Software",
          },
        ],
      },
      {
        name: "Trade Assciations, Agencies, Societies",
      },
      {
        name: "Training & Workforce Development Services/Software",
      },
      {
        name: "Universities, Colleges & Research Centers",
      },
    ],
  },
  {
    name: "Cleaning & Pretreatment",
    children: [
      {
        name: "Abrasive & Mechanical Cleaning",
        children: [
          {
            name: "Abrasive Blasting Equipment, Dry",
          },
          {
            name: "Abrasive Blasting Equipment, Glass Bead",
          },
          {
            name: "Abrasive Blasting Equipment, Wet, Vapor",
          },
          {
            name: "Abrasive Blasting Materials",
          },
          {
            name: "Parts Washers, Mechanically Agitated",
          },
          {
            name: "Small Parts Washers",
          },
        ],
      },
      {
        name: "Chemical Cleaning & Pretreatment",
        children: [
          {
            name: "Chrome-Free Final Rinses (for Paint Pretreatment)",
          },
          {
            name: "Cleaning & Pretreatment Chemicals",
          },
          {
            name: "Cleaning Chemicals, Solvent",
          },
          {
            name: "Degreasers, Solvent & Vapor",
          },
          {
            name: "Descaling Chemicals & Equipment",
          },
          {
            name: "Inhibitors, Acid Pickling",
          },
          {
            name: "Mold Strippers",
          },
          {
            name: "Paint Stripping Equipment & Materials",
            children: [
              {
                name: "Burn Off",
              },
              {
                name: "Chemical Strippers",
              },
              {
                name: "High-Pressure Water Spray",
              },
              {
                name: "Hot Fluidized Bed",
              },
              {
                name: "Molten Salt Bath",
              },
              {
                name: "Paint & Rust Stripping Services",
              },
              {
                name: "Paint Stripping Tools",
              },
              {
                name: "Plastic Abrasive Media Blast",
              },
              {
                name: "Sodium Bicarbonate",
              },
              {
                name: "Solvent-Based",
              },
            ],
          },
          {
            name: "Pickling Solutions",
          },
          {
            name: "Rust Removal & Prevention",
          },
          {
            name: "Smut Removers, Aluminum",
          },
          {
            name: "Surface-Active Agents",
          },
          {
            name: "Tarnish-Preventive Treatments",
          },
        ],
      },
      {
        name: "Cleaning Equipment & Systems",
        children: [
          {
            name: "Cleaning Equipment, High-Pressure Wand",
          },
          {
            name: "Cleaning Equipment, Ultrasonic",
          },
          {
            name: "Cleaning Systems, Aqueous",
          },
          {
            name: "Cleaning Systems, Centrifugal",
          },
          {
            name: "Mold-Cleaning Equipment & Chemicals",
          },
          {
            name: "Plasma Surface Treatment Systems",
          },
          {
            name: "Spray Mask Washing Machines",
          },
          {
            name: "Steam Cleaning & Phosphating",
          },
          {
            name: "Used Cleaning Equipment",
          },
        ],
      },
      {
        name: "Facilities, Consulting & Services",
        children: [
          {
            name: "Cleaning Equipment Engineering & Installation Services",
          },
          {
            name: "Consultants, Cleaning & Pretreatment",
          },
          {
            name: "Mold Cleaning Services",
          },
          {
            name: "Rack Stripping Equipment",
          },
        ],
      },
      {
        name: "Process Equipment & Engineering",
        children: [
          {
            name: "Air Blow-Off Devices",
          },
          {
            name: "Air Compressors",
          },
          {
            name: "Baskets, Dipping, Pickling, Handling",
          },
          {
            name: "Blowers, Air (for Push-Pull Ventilation)",
          },
          {
            name: "Distillation Equipment",
          },
          {
            name: "Dryers",
          },
          {
            name: "Nozzles, Liquid Spray",
          },
        ],
      },
      {
        name: "Specialized Coating & Conversion Treatments",
        children: [
          {
            name: "Aluminum Etchants & Deoxidizers",
          },
          {
            name: "Chromate Conversion Coatings",
          },
          {
            name: "Chromium-Free Conversion Coatings for Aluminum",
          },
          {
            name: "Coatings, Dry-film or Solid-film Lubricant",
          },
          {
            name: "Dyes for Chromate and/or Phosphate Coatings",
          },
          {
            name: "Phosphate Coating Chemicals",
          },
          {
            name: "Stripping Solutions, Metal",
          },
        ],
      },
      {
        name: "Testing & Monitoring",
        children: [
          {
            name: "Analytical Equipment, Automatic Solution Titration",
          },
          {
            name: "Balls, Floating Plastic (for Solution Heat Retention and/or Fume Suppression)",
          },
          {
            name: "Clean Rooms & Components",
          },
          {
            name: "Liquid Flow Meters",
          },
          {
            name: "pH Monitoring",
          },
          {
            name: "Testing Equipment, Solution Concentration",
          },
          {
            name: "Testing Equipment, Surface Cleanliness",
          },
          {
            name: "Testing Equipment, Surface Tension",
          },
          {
            name: "Transducers, Ultrasonic",
          },
        ],
      },
      {
        name: "Water & Waste Management",
        children: [
          {
            name: "Acids & Acid Salts",
          },
          {
            name: "Deionizers, Demineralizers",
          },
          {
            name: "Oil Recovery & Recycling",
          },
          {
            name: "Oil Skimmers, Separators",
          },
          {
            name: "Resin Clean-up Solutions",
          },
          {
            name: "Rinse Aids",
          },
          {
            name: "Solvent Stills & Recovery Equipment",
          },
          {
            name: "Water-Softening Equipment",
          },
        ],
      },
    ],
  },
  {
    name: "Composites Fabrication",
    children: [
      {
        name: "Auxiliary Processing & Repair Equipment",
        children: [
          {
            name: "Auxiliary Processing Equipment",
            children: [
              {
                name: "Abrasive Tools",
              },
              {
                name: "Adhesive Applicators",
              },
              {
                name: "Bonding Equipment",
              },
              {
                name: "Catalyst Dispensers",
              },
              {
                name: "Choppers",
              },
              {
                name: "Compressors",
              },
              {
                name: "Creels & Bobbins, For Fiber",
              },
              {
                name: "Cutting & Drilling",
                children: [
                  {
                    name: "Diecutting",
                  },
                  {
                    name: "Drilling & Cutting Tools",
                  },
                  {
                    name: "Flatbed, Computerized",
                  },
                  {
                    name: "Laser",
                  },
                  {
                    name: "Manual",
                  },
                  {
                    name: "Saws",
                  },
                  {
                    name: "Ultrasonic",
                  },
                ],
              },
              {
                name: "Drying Equipment",
              },
              {
                name: "Grinders, Granulators, Pulverizers",
              },
              {
                name: "Kitting Equipment & Software",
              },
              {
                name: "Mandrel Extractors",
              },
              {
                name: "Metering/Dispensing Equipment",
              },
              {
                name: "Mixers",
              },
              {
                name: "Plasma Treatment Equipment",
              },
              {
                name: "Printing/Marking Equipment",
              },
              {
                name: "Process Controls",
              },
              {
                name: "Projection/Alignment Systems, Laser",
              },
              {
                name: "Pulverizing/Grinding Equipment",
              },
              {
                name: "Resin Injection Equipment, Pultrusion",
              },
              {
                name: "Resin Wetout Equipment, Pultrusion & Filament Winding",
              },
              {
                name: "Roll Stands",
              },
              {
                name: "Rollers",
              },
              {
                name: "Routers",
              },
              {
                name: "Sanders, Grinders",
              },
              {
                name: "Slitters",
              },
              {
                name: "Smc, Pultrusion, Filament Winding",
              },
              {
                name: "Trimming Equipment",
              },
              {
                name: "Used Auxiliary Equipment",
              },
              {
                name: "Uv Curing Equipment",
              },
              {
                name: "Vacuum Storage Chambers",
              },
              {
                name: "Waterjet Machining Equipment",
              },
              {
                name: "Welding Equipment For Thermoplastics",
              },
              {
                name: "Winders/Rewinders",
              },
            ],
          },
          {
            name: "Composite Repair Equipment",
            children: [
              {
                name: "Heater Blankets",
              },
              {
                name: "Heaters",
              },
              {
                name: "Hot Bonders",
              },
              {
                name: "Repair Autoclaves",
              },
              {
                name: "Repair Kits & Equipment",
              },
              {
                name: "Repair Ovens",
              },
              {
                name: "Vacuum/Repair Tables (Heated/Unheated)",
              },
            ],
          },
          {
            name: "Rapid Prototyping/Manufacturing Systems",
            children: [
              {
                name: "3D Printing / Additive Manufacturing",
              },
              {
                name: "Fused Deposition Modeling",
              },
              {
                name: "Laser Sintering",
              },
            ],
          },
        ],
      },
      {
        name: "Composite Structures & Components",
        children: [
          {
            name: "Aerospace, Aircraft Interior",
          },
          {
            name: "Aerospace, Flight Control Surfaces",
          },
          {
            name: "Aerospace, Fuselage/Wing",
          },
          {
            name: "Aerospace, Radomes",
          },
          {
            name: "Armor, Ceramic",
          },
          {
            name: "Armor, Composite",
          },
          {
            name: "Automotive, Body Panels & Substructures",
          },
          {
            name: "Automotive, Interior (Seats,IPCs, Floor Panels, Etc.)",
          },
          {
            name: "Automotive, Underhood",
          },
          {
            name: "Carbon/Carbon Composites",
          },
          {
            name: "Ceramic Matrix Composites",
          },
          {
            name: "Cipp (Cured-In-Place-Pipe)",
          },
          {
            name: "Flywheels, Composite",
          },
          {
            name: "Infrastructure, Composite",
          },
          {
            name: "Laminate Panels, With Core",
          },
          {
            name: "Laminate Sheets, Solid",
          },
          {
            name: "Marine, Boat (Hulls, Decks, Bulkheads, Etc.)",
          },
          {
            name: "Marine, Docks/Pilings",
          },
          {
            name: "Marine, Other",
          },
          {
            name: "Metal Matrix Composites",
          },
          {
            name: "Other Composite Structures",
          },
          {
            name: "Pressure Vessels",
          },
          {
            name: "Profiles",
          },
          {
            name: "Rebar",
          },
          {
            name: "Rods",
          },
          {
            name: "Tubes",
          },
          {
            name: "Wood Plastic Composite Fencing, Decking & Railing",
          },
        ],
      },
      {
        name: "Design, Testing, Consulting",
        children: [
          {
            name: "Architectural Design",
          },
          {
            name: "Cae Design",
          },
          {
            name: "Civil Engineering",
          },
          {
            name: "Contract/Toll Compounding Services",
          },
          {
            name: "Converting Services",
          },
          {
            name: "Expert Witness",
          },
          {
            name: "Finite Element Modeling/Analysis (FEM/FEA)",
          },
          {
            name: "Inspection Services",
          },
          {
            name: "Machine Calibration Services",
          },
          {
            name: "Patent Filing",
          },
          {
            name: "Product Design",
          },
          {
            name: "Recycling Services",
          },
          {
            name: "Regulatory Compliance",
          },
          {
            name: "Repair Services, Composites",
          },
          {
            name: "Repair Services, Equipment & Machines",
          },
          {
            name: "Structural Health Monitoring Equipment (Turnkey Systems",
          },
          {
            name: "Structural Strengthening / Reinforcement Services",
          },
          {
            name: "Surplus/Salvage Buyers",
          },
        ],
      },
      {
        name: "Fabricating Services",
        children: [
          {
            name: "Other Fabricating Services",
          },
          {
            name: "Thermoplastic Composites Fabrication",
            children: [
              {
                name: "Adhesive Bonding",
              },
              {
                name: "Autoclave Cure",
              },
              {
                name: "Automated Fiber Placement",
              },
              {
                name: "Automated Tape Laying",
              },
              {
                name: "Coating & Painting",
              },
              {
                name: "Compression Molding",
              },
              {
                name: "Continuous Laminating",
              },
              {
                name: "Custom Compounding & Blending",
              },
              {
                name: "Cutting, Finishing, & Machining",
              },
              {
                name: "Hand Layup",
              },
              {
                name: "Honeycomb Structures",
              },
              {
                name: "Injection Molding",
              },
              {
                name: "Metal Bonding",
              },
              {
                name: "Moldmaking & Patternmaking",
              },
              {
                name: "Other Thermoplastics Fabricating Services",
              },
              {
                name: "Pressure Forming",
              },
              {
                name: "Prototyping",
              },
              {
                name: "Surface Treatment",
              },
              {
                name: "Textile Processing For Composites (Braiding, Stitching, Weaving)",
              },
              {
                name: "Vacuum Forming",
              },
              {
                name: "Welding & Sealing",
              },
            ],
          },
          {
            name: "Thermoset Composites Fabrication",
            children: [
              {
                name: "Vacuum-Assisted Resin Transfer Molding (VARTM)",
              },
              {
                name: "Adhesive Bonding",
              },
              {
                name: "Autoclave Cure",
              },
              {
                name: "Automated Fiber Placement",
              },
              {
                name: "Automated\ufffdTape Laying",
              },
              {
                name: "Coating & Painting",
              },
              {
                name: "Compression Molding",
              },
              {
                name: "Continuous Laminating",
              },
              {
                name: "Custom Compounding & Blending",
              },
              {
                name: "Cutting, Finishing, & Machining",
              },
              {
                name: "Diaphragm Forming",
              },
              {
                name: "Filament Winding",
              },
              {
                name: "Hand Layup",
              },
              {
                name: "Honeycomb Structures",
              },
              {
                name: "Injection Molding",
              },
              {
                name: "Metal Bonding",
              },
              {
                name: "Moldmaking & Patternmaking",
              },
              {
                name: "Other Thermoset Fabricating Services",
              },
              {
                name: "Pressure Forming",
              },
              {
                name: "Prototyping",
              },
              {
                name: "Pullwinding",
              },
              {
                name: "Pultrusion",
              },
              {
                name: "Reaction Injection Molding (RIM)",
              },
              {
                name: "Resin Transfer Molding (RTM)",
              },
              {
                name: "Roll Forming",
              },
              {
                name: "Roll Wrapping",
              },
              {
                name: "Rotational Molding",
              },
              {
                name: "Sealing",
              },
              {
                name: "Sprayup",
              },
              {
                name: "Structural Reaction Injection Molding (SRIM)",
              },
              {
                name: "Surface Treatment",
              },
              {
                name: "Tape Laying",
              },
              {
                name: "Textile Processing For Composites (Braiding, Stitching, Weaving)",
              },
              {
                name: "Vacuum Forming",
              },
            ],
          },
        ],
      },
      {
        name: "Fiber Converting/Prepreg Manufacturing",
        children: [
          {
            name: "Braiding Equipment",
          },
          {
            name: "Coaters",
          },
          {
            name: "Impregnation Lines",
            children: [
              {
                name: "Impregnation Lines, Film-Based",
              },
              {
                name: "Impregnation Lines, Hot Melt",
              },
              {
                name: "Impregnation Lines, Powder",
              },
              {
                name: "Impregnation Lines, Solvent",
              },
            ],
          },
          {
            name: "Knitting Equipment",
          },
          {
            name: "Looms For Advanced Fibers",
          },
          {
            name: "Metering/Dispensing Equipment",
          },
          {
            name: "Ovens, Oxidation",
          },
          {
            name: "Preform Manufacturing Equipment",
          },
          {
            name: "Splicing Devices",
          },
          {
            name: "Stitching Equipment",
          },
          {
            name: "Tensioning Equipment",
          },
          {
            name: "Used Equipment",
          },
          {
            name: "Web Measurement & Control Equipment",
          },
        ],
      },
      {
        name: "Primary Manufacturing Equipment",
        children: [
          {
            name: "Autoclaves",
          },
          {
            name: "Autoclaves, Lab Size",
          },
          {
            name: "Autoclaves, Software & Controls",
          },
          {
            name: "Automated Fiber Placement Systems",
          },
          {
            name: "Automated Tape Laying Systems",
          },
          {
            name: "Bladder Molding Equipment (Formerly Pressure Bag)",
          },
          {
            name: "Casting Equipment",
          },
          {
            name: "Continuous Laminating Machines",
          },
          {
            name: "Electron Beam Accelerators",
          },
          {
            name: "Extruders",
          },
          {
            name: "Filament Winding Machines & Controls",
          },
          {
            name: "Flow-Coating Equipment",
          },
          {
            name: "Foam Application Equipment",
          },
          {
            name: "Impregnation Lines",
          },
          {
            name: "Lfrt Compounding/Molding Machinery",
          },
          {
            name: "Metal Matrix Composite Casting Machines",
          },
          {
            name: "Other Primary Manufacturing Equipment",
          },
          {
            name: "Polymer Concrete Machinery",
          },
          {
            name: "Preform Manufacturing Equipment",
          },
          {
            name: "Presses (Preforming Compression, Laminating, etc.)",
            children: [
              {
                name: "Compression Molding",
              },
              {
                name: "Diaphragm Forming",
              },
              {
                name: "Hydraulic",
              },
              {
                name: "Injection Molding",
              },
              {
                name: "Laminating",
              },
              {
                name: "Low-Pressure",
              },
              {
                name: "Software & Controls",
              },
              {
                name: "Superplastic Forming",
              },
              {
                name: "Thermoforming/Pressure Forming",
              },
              {
                name: "Vacuum",
              },
            ],
          },
          {
            name: "Pultrusion Equipment, Thermoplastics",
          },
          {
            name: "Pultrusion Equipment, Thermosets",
          },
          {
            name: "Reaction Injection Molding Equipment (RIM, RRIM, SRIM)",
          },
          {
            name: "Resin Transfer Molding Equipment (RTM)",
          },
          {
            name: "Roll-Forming Machines",
          },
          {
            name: "Roll-Wrapping Machines (Not Tables)",
          },
          {
            name: "Rotational Molding Equipment",
          },
          {
            name: "Spray Booths",
          },
          {
            name: "Spray Guns",
          },
          {
            name: "Used Primary Equipment",
          },
          {
            name: "Vacuum Formers",
          },
          {
            name: "Vacuum-Assisted Resin Transfer Molding Equipment (VARTM)",
          },
        ],
      },
      {
        name: "Tool Types",
        children: [
          {
            name: "Hot-Air",
          },
          {
            name: "Hybrid Fiber",
          },
          {
            name: "Integrally Heated",
          },
          {
            name: "Prototype",
          },
          {
            name: "Pultrusion Dies",
          },
          {
            name: "RTM/Resin Infusion",
          },
        ],
      },
      {
        name: "Tools/Tooling Materials",
        children: [
          {
            name: "Mandrels",
            children: [
              {
                name: "Aluminum",
              },
              {
                name: "Inflatable",
              },
              {
                name: "Other",
              },
              {
                name: "Segmented",
              },
              {
                name: "Steel",
              },
            ],
          },
          {
            name: "Tooling Equipment & Supplies",
            children: [
              {
                name: "Backup Structures",
              },
              {
                name: "Ceramic/Ceramic Powder",
              },
              {
                name: "Mass Cast Acrylic",
              },
              {
                name: "Master Pattern Material, Other",
              },
              {
                name: "Master Pattern Material, Polymeric",
              },
              {
                name: "Mold Cleaners",
              },
              {
                name: "Mold Polishes",
              },
              {
                name: "Mold Release Agents",
              },
              {
                name: "Mold Release Films",
              },
              {
                name: "Monolithic Graphite",
              },
              {
                name: "Other Tools/Tooling Supplies",
              },
              {
                name: "Tooling Board",
              },
              {
                name: "Tooling Prepreg",
              },
              {
                name: "Urethane",
              },
            ],
          },
          {
            name: "Tooling Materials",
            children: [
              {
                name: "Carbon Fiber Composite",
              },
              {
                name: "Cast",
              },
              {
                name: "Clay (Modeling)",
              },
              {
                name: "Composite",
              },
              {
                name: "Composite, Other",
              },
              {
                name: "Expendable Materials",
              },
              {
                name: "Fiberglass Composite",
              },
              {
                name: "Flexible Mold Materials",
              },
              {
                name: "Graphite, Cast",
              },
              {
                name: "Graphite, Monolithic",
              },
              {
                name: "Hybrid Materials",
              },
              {
                name: "Metal (aluminum, invar, nickel shell, steel)",
              },
              {
                name: "Plaster",
              },
              {
                name: "Preform Screens",
              },
              {
                name: "Prepreg",
              },
              {
                name: "Resin Injection",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Inspection, Testing, Measurement",
    children: [
      {
        name: "Advanced & Specialized Testing Systems",
        children: [
          {
            name: "AI-Powered Quality Control Systems",
          },
          {
            name: "Cure-Monitoring Equipment",
          },
          {
            name: "Gel Timers",
          },
          {
            name: "Infusion Flow Analysis Software",
          },
          {
            name: "Melt-Flow Indexers",
          },
          {
            name: "Modeling/Simulation/Virtual Testing Software",
          },
          {
            name: "Tack Monitoring Equipment",
          },
        ],
      },
      {
        name: "Calibration & Tool Presetting Equipment",
        children: [
          {
            name: "Calibration Equipment",
          },
          {
            name: "Sensors, In-Situ Modifiers",
          },
          {
            name: "Tool Presetting Equipment",
          },
        ],
      },
      {
        name: "Chemical & Rheological Testing",
        children: [
          {
            name: "Chromatography",
          },
          {
            name: "Plastics Material Composition & Chemical Analysis",
          },
          {
            name: "Resin Content Analyzers",
          },
          {
            name: "Rheological Testing Equipment",
          },
          {
            name: "Viscosity Measurement Equipment",
          },
          {
            name: "Volatile Monitoring Equipment",
          },
        ],
      },
      {
        name: "Coating, Paint, & Plating Testing",
        children: [
          {
            name: "Adhestion Testing",
          },
          {
            name: "Coating Testing Laboratories",
          },
          {
            name: "Coating Thickness Testing",
          },
          {
            name: "Color & Gloss Testing",
          },
          {
            name: "Electrocoating Testing",
          },
          {
            name: "Painting Testing",
          },
          {
            name: "Panels, Paint & Plating Testing",
          },
          {
            name: "Plating Solution Testing",
          },
          {
            name: "Plating Testing",
          },
          {
            name: "Powder Coating Testing",
          },
          {
            name: "Surface Finishing, Measurement Equipment Used For",
          },
        ],
      },
      {
        name: "Dimensional & Surface Measurement Equipment",
        children: [
          {
            name: "Autocollimators",
          },
          {
            name: "Comparators, Optical & Other",
          },
          {
            name: "Coordinate Measuring Machine (CMM) Software",
          },
          {
            name: "Coordinate Measuring Machines",
          },
          {
            name: "Data Collection Devices for Gaging, SPC, etc",
          },
          {
            name: "Flatness Measuring Equipment",
          },
          {
            name: "Gages, Electronic/Digital",
          },
          {
            name: "Gages, Mechanical",
          },
          {
            name: "Gear Inspection Equipment",
          },
          {
            name: "Laminate Thickness Gauges",
          },
          {
            name: "Roundness Measuring Equipment",
          },
          {
            name: "Surface Plates",
          },
          {
            name: "Thickness Measuring Equipment",
          },
          {
            name: "Vision Systems",
          },
          {
            name: "Weight Scales",
          },
        ],
      },
      {
        name: "Electrical & Thermal Testing Instruments",
        children: [
          {
            name: "Ammeters & Voltmeters",
          },
          {
            name: "Ampere-Hour Meters",
          },
          {
            name: "Current-Density Meters",
          },
          {
            name: "Electrical & Thermal Testing",
          },
          {
            name: "pH Monitoring",
          },
          {
            name: "Pressure Monitoring Equipment",
          },
          {
            name: "Temperature Indicators, Recorders",
          },
          {
            name: "Thermal Analysis Instruments",
          },
        ],
      },
      {
        name: "Environmental, Weathering, & Durability Testing",
        children: [
          {
            name: "Environmental Testing Equipment",
          },
          {
            name: "Flammability/Smoke Testers",
          },
          {
            name: "Weathering Testing",
          },
        ],
      },
      {
        name: "Fluid Flow & Process Monitoring",
        children: [
          {
            name: "Centrifuges",
          },
          {
            name: "Flow Meters",
          },
          {
            name: "Probes, Electromechanical",
          },
          {
            name: "Refractometers",
          },
        ],
      },
      {
        name: "Inspection/Measurement Services",
      },
      {
        name: "Material Testing & Mechanical Performance Equipment",
        children: [
          {
            name: "Balancing Machines & Equipment",
          },
          {
            name: "Composites - Materials & Product  Testing & Analysis Equipment",
          },
          {
            name: "Compression-After-Impact Testers",
          },
          {
            name: "Fatigue-Testing Equipment",
          },
          {
            name: "Flexural Testers",
          },
          {
            name: "Hardness Testing Equipment",
          },
          {
            name: "Impact-Testing Equipment",
          },
          {
            name: "Mechanical Test Fixtures",
          },
          {
            name: "Metals - Material Testing & Analysis Equipment",
          },
          {
            name: "Modulus Testers",
          },
          {
            name: "Plastics - Mechanical & Physical Testing Equipment",
          },
          {
            name: "Structural testing",
          },
          {
            name: "Tensile Testers",
          },
          {
            name: "Universal Test Frames",
          },
        ],
      },
      {
        name: "Non-Destructive Testing (NDT) & Defect Detection",
        children: [
          {
            name: "Borescopes",
          },
          {
            name: "Flaw Detection Equipment",
          },
          {
            name: "Interferometers",
          },
          {
            name: "Laser Measurement Systems",
          },
          {
            name: "Leak Testing Equipment",
          },
          {
            name: "NDI Systems (Non-Destructive Inspection)",
          },
          {
            name: "Surface Analyzers",
          },
        ],
      },
    ],
  },
  {
    name: "Manufacturing Execution & Automation Software & Controls",
    children: [
      {
        name: "Advanced Analytics Software",
        children: [
          {
            name: "Demand Forecasting Tools",
          },
          {
            name: "Manufacturing Data Analytics Platforms",
          },
          {
            name: "Predictive Analytics Tools",
          },
          {
            name: "Real-Time Decision Making Software/Dashboards/Systems",
          },
        ],
      },
      {
        name: "AI-Enabled Predictive Maintenance & Asset Management",
        children: [
          {
            name: "IoT-enabled Maintenance Tools",
            children: [
              {
                name: "IoT Maintenance Alerts",
              },
              {
                name: "Smart Sensors for Predictive Maintenance",
              },
            ],
          },
          {
            name: "Predictive Maintenance Software",
            children: [
              {
                name: "Machine Learning for Maintenance Prediction",
              },
              {
                name: "Sensor Data Analysis Tools",
              },
            ],
          },
        ],
      },
      {
        name: "Augmented & Virtual Reality Systems",
        children: [
          {
            name: "AR Software for Remote Assistance",
          },
          {
            name: "AR/VR Headsets for Manufacturing",
          },
          {
            name: "VR Training Simulators",
          },
        ],
      },
      {
        name: "CAD/CAM",
        children: [
          {
            name: "CAD/CAM for Additive Manufacturing",
          },
          {
            name: "CAD/CAM Software",
          },
          {
            name: "Cutting Tool Design",
          },
          {
            name: "Engineering Analysis & Simulation",
          },
          {
            name: "Machinability Databases",
          },
          {
            name: "NC Program Optimization",
          },
          {
            name: "NC Verification",
          },
          {
            name: "Nesting Software",
          },
          {
            name: "Post Processors, Stand-Alone",
          },
        ],
      },
      {
        name: "Carbon Footprint Tracking Software",
        children: [
          {
            name: "Carbon Accounting Software",
          },
          {
            name: "Lifecycle Assessment Tools",
          },
        ],
      },
      {
        name: "CNCs & Related Hardware",
        children: [
          {
            name: "CNC Software",
          },
          {
            name: "CNC Units",
          },
          {
            name: "Communications Networks & Data Transmission Equipment",
          },
          {
            name: "Digital Readout (DRO) Units",
          },
          {
            name: "Digitizing/Scanning Systems",
          },
          {
            name: "Direct or Distributive Numerical Control (DNC) Systems",
          },
          {
            name: "Machine Monitoring",
          },
          {
            name: "Programmable Logic Controls",
          },
          {
            name: "Robot Controllers",
          },
        ],
      },
      {
        name: "Controls, Monitors, Sensors",
        children: [
          {
            name: "Closed-loop Process Control Systems",
          },
          {
            name: "Composites Controls & Software",
          },
          {
            name: "Controllers, Monitors",
          },
          {
            name: "Controls & Software for Composites Fabrication",
          },
          {
            name: "Controls for Surface Finishing & Pretreatment",
            children: [
              {
                name: "Air Pressure",
              },
              {
                name: "Alkalinity Regulation",
              },
              {
                name: "Alkalinity Regulation",
              },
              {
                name: "Controls, Gas/Vapor Concentration",
              },
              {
                name: "Current",
              },
              {
                name: "Effluent Monitoring",
              },
              {
                name: "Electroless Plating",
              },
              {
                name: "Electroplating",
              },
              {
                name: "Fluid Pressure",
              },
              {
                name: "Liquid Level",
              },
              {
                name: "Paint Color-Changing",
              },
              {
                name: "pH",
              },
              {
                name: "Rinse Tank Concentration",
              },
              {
                name: "Solution Conductivity",
              },
              {
                name: "Surface Finishing Control Systems, General",
              },
              {
                name: "Temperature",
              },
            ],
          },
          {
            name: "Dewpoint Monitors/Moisture Analyzers",
          },
          {
            name: "Drive Controls",
          },
          {
            name: "Flow Monitoring/Control Devices (for Liquids)",
          },
          {
            name: "Level Sensors & Controls",
          },
          {
            name: "Machine Controls",
          },
          {
            name: "Machine Monitoring/Alarm Systems",
          },
          {
            name: "Motion or Position Controls",
          },
          {
            name: "Part Recognition",
          },
          {
            name: "Pressure Controllers, Monitors",
          },
          {
            name: "Pressure Sensors, Transducers",
          },
          {
            name: "Programmable Controllers",
          },
          {
            name: "Recording Instruments",
          },
          {
            name: "Sensors, Thermocouples",
          },
        ],
      },
      {
        name: "Digital Twin Software",
        children: [
          {
            name: "Digital Twin Creation Software (CAD Integration, Data Sync)",
          },
          {
            name: "Digital Twin Maintenance & Monitoring Services",
          },
          {
            name: "IoT Platforms for Digital Twin Integration",
          },
          {
            name: "Simulation Software for Digital Twins",
          },
        ],
      },
      {
        name: "Edge Computing & IoT Devices",
        children: [
          {
            name: "Edge Computing Hardware, Servers, PCs",
          },
          {
            name: "IIoT Gateways (Wireless, Cellular)",
          },
          {
            name: "Industrial IoT Sensors",
            children: [
              {
                name: "Environmental Sensors",
              },
              {
                name: "Pressure Sensors",
              },
              {
                name: "Temperature Sensors",
              },
              {
                name: "Vibration Sensors",
              },
            ],
          },
        ],
      },
      {
        name: "Engineering & Simulation Tools",
        children: [
          {
            name: "CAE (Computer Aided Engineering)",
          },
          {
            name: "Generative Design Software",
          },
          {
            name: "Modeling/Simulation/Virtual Testing Software",
          },
          {
            name: "Mold Flow & Simulation Software",
          },
        ],
      },
      {
        name: "ERP & Business Management",
        children: [
          {
            name: "Accounting Software",
          },
          {
            name: "Calibration Software",
          },
          {
            name: "CIM (Computer Integrated Manufacturing)",
          },
          {
            name: "Color Matching/Formulating Systems",
          },
          {
            name: "Data Management & Visualization",
          },
          {
            name: "Design of Experiments (DOE) Software",
          },
          {
            name: "ERP for Make-to-Order Mfg",
          },
          {
            name: "ERP for Standard Mfg",
          },
          {
            name: "ISO 9000 Software",
          },
          {
            name: "Job Estimating Software",
          },
          {
            name: "Machining, Routing Software",
          },
          {
            name: "Maintenance Management Systems",
          },
          {
            name: "Manufacturing Execution Systems (MES)",
          },
          {
            name: "Materials Formulating Systems",
          },
          {
            name: "Nesting Software",
          },
          {
            name: "Other Manufacturing Software",
          },
          {
            name: "Product & Tool Design, Analysis Software (CAD/CAM/CAE)",
          },
          {
            name: "Quality Documentation",
          },
          {
            name: "Reverse Engineering Software",
          },
          {
            name: "Scheduling, MRP, Production & Inventory Management Systems",
          },
          {
            name: "Screw Design/Analysis Software",
          },
          {
            name: "SPC, SQC Systems",
          },
          {
            name: "Statistical Data Collection & Analysis",
          },
          {
            name: "Surface Finishing Software",
          },
          {
            name: "Tool Crib Control",
          },
          {
            name: "Troubleshooting, Problem Solving Systems",
          },
        ],
      },
    ],
  },
  {
    name: "Manufacturing Services",
    children: [
      {
        name: "Additive Manufacturing/3D Printing Services",
        children: [
          {
            name: "Large Format",
          },
          {
            name: "Small Format",
          },
        ],
      },
      {
        name: "Appraisals",
      },
      {
        name: "Automation/Systems Integration",
      },
      {
        name: "Barrier Surface Treatment",
      },
      {
        name: "Business Services for Plastics (Finance, Insurance, Leasing)",
      },
      {
        name: "Catalog & Equipment Outlets",
      },
      {
        name: "Cleaning Equipment Engineering & Installation Services",
      },
      {
        name: "Contract/Toll Compounding Services",
      },
      {
        name: "Custom Compounding, Formulating - Thermoplastics",
      },
      {
        name: "Data Management Services",
      },
      {
        name: "Deburring Services",
      },
      {
        name: "EDM Services",
      },
      {
        name: "Environmental Monitoring & Analysis",
      },
      {
        name: "Equipment Cleaning Services",
      },
      {
        name: "Finishing Services",
      },
      {
        name: "Hard Facing, Surface Treating of Tooling, Equipment",
      },
      {
        name: "Heat Treating Services",
      },
      {
        name: "Hydraulic Oil Filtering/Reclaim Service",
      },
      {
        name: "Inspection/Measurement Services",
      },
      {
        name: "Internet-Only Machine Tool Sales (New & Used)",
      },
      {
        name: "Machine Maintenance & Repair",
      },
      {
        name: "Machining Services",
      },
      {
        name: "Mass Finishing Equipment Engineering & Installation Services",
      },
      {
        name: "Metal Sales & Services, Internet-Only",
      },
      {
        name: "Mold Cleaning Services",
      },
      {
        name: "Mold Flow & Simulation Services",
      },
      {
        name: "Mold Maintenance & Repair Services",
      },
      {
        name: "Mold Texturing, Engraving  Services",
      },
      {
        name: "Mold Tryout/Sampling Services",
      },
      {
        name: "Mold/Tooling Design Services",
      },
      {
        name: "Mold/Tooling Simulation & Analysis Services",
      },
      {
        name: "Overspray Recycling/Recovery Systems/Services",
      },
      {
        name: "Paint & Rust Stripping Services",
      },
      {
        name: "Painting Equipment Engineering & Installation",
      },
      {
        name: "Part/Mold Inspection or Digitizing",
      },
      {
        name: "Plastics Decorating/Finishing Services",
      },
      {
        name: "Plastics Machine Alignment Services",
      },
      {
        name: "Plastics Machine Installation Services",
      },
      {
        name: "Plastics Machine Maintenance Services",
      },
      {
        name: "Plastics Materials Testing Services",
      },
      {
        name: "Plastics Processing Machine Builders",
      },
      {
        name: "Plastics Processing Machinery Rebuilding",
      },
      {
        name: "Plastics Recycling - Purchasing Scrap or Waste Plastics",
      },
      {
        name: "Plastics Size-reduction (Grinding) Services",
      },
      {
        name: "Plating Equipment Engineering & Installation Services",
      },
      {
        name: "Polishing Services",
      },
      {
        name: "Powder Coating Equipment Engineering & Installation",
      },
      {
        name: "Printed Circuit Board Design & Manufacturing",
      },
      {
        name: "Prototyping Services",
      },
      {
        name: "Quality & Measurement",
      },
      {
        name: "Radiation Processing Services",
      },
      {
        name: "Rebuilt Motors & Drives",
      },
      {
        name: "Rebuilt Screws or Barrels",
      },
      {
        name: "Reclamation/Recycling Services, Scrap Dealers",
      },
      {
        name: "Rectifier Rebuilding & Repair",
      },
      {
        name: "Replacement & Repair Parts",
      },
      {
        name: "Request for Quote Services, Internet-Only",
      },
      {
        name: "Retrofitting, Rebuilding, Remanufacturing Services",
      },
      {
        name: "Scanning & Metrology Services",
      },
      {
        name: "Tank Lining Services for Mass-Finishing Equipment",
      },
      {
        name: "Welding Services",
      },
    ],
  },
  {
    name: "Materials",
    children: [
      {
        name: "Composites Materials",
        children: [
          {
            name: "Additive Manufacturing/3D Printing Systems",
            children: [
              {
                name: "Continuous Fiber/Thermoplastic Resin",
              },
              {
                name: "Discontinuous Fiber/Thermoplastic Resin",
              },
            ],
          },
          {
            name: "Adhesives",
            children: [
              {
                name: "Acrylic",
              },
              {
                name: "Bismaleimide",
              },
              {
                name: "Cyanoacrylate",
              },
              {
                name: "Epoxy",
              },
              {
                name: "Methyl methacrylate",
              },
              {
                name: "Nylon",
              },
              {
                name: "Other Adhesives",
              },
              {
                name: "Phenolic",
              },
              {
                name: "Polyimide",
              },
              {
                name: "Silicone",
              },
              {
                name: "Urethane",
              },
            ],
          },
          {
            name: "Casting Resins",
            children: [
              {
                name: "Acrylic",
              },
              {
                name: "Epoxy",
              },
              {
                name: "Other Casting Resins",
              },
              {
                name: "Unsaturated Polyester",
              },
            ],
          },
          {
            name: "Catalysts, Promoters & Curing Agents",
            children: [
              {
                name: "Cobalt Naphthenate",
              },
              {
                name: "Curing Agents",
              },
              {
                name: "Hardeners",
              },
              {
                name: "Initiators",
              },
              {
                name: "Other Catalysts/Promoters",
              },
              {
                name: "Peroxides",
              },
            ],
          },
          {
            name: "Coatings & Sizings",
            children: [
              {
                name: "Conductive",
              },
              {
                name: "Decorative",
              },
              {
                name: "Electrostatic",
              },
              {
                name: "Emi-Attenuation",
              },
              {
                name: "Flame Retardant",
              },
              {
                name: "In-Mold",
              },
              {
                name: "Other Coating Materials",
              },
              {
                name: "Paint",
              },
              {
                name: "Powder",
              },
              {
                name: "Protective",
              },
              {
                name: "Sizings",
              },
            ],
          },
          {
            name: "Compounds",
            children: [
              {
                name: "Bulk Molding (Bmc)",
              },
              {
                name: "Fairing Compounds (Formerly Paste Systems)",
              },
              {
                name: "Low-Pressure Molding",
              },
              {
                name: "Other Compounds",
              },
              {
                name: "Sheet Molding (Smc)",
              },
              {
                name: "Thermoplastic, Long Fiber-Reinforced (Lfrt)",
              },
              {
                name: "Thermoplastic, Short Fiber-Reinforced",
              },
            ],
          },
          {
            name: "Core Materials & Flow Media",
            children: [
              {
                name: "Balsa",
              },
              {
                name: "Flow Media For Resin Infusion",
              },
              {
                name: "Foam Core",
              },
              {
                name: "Honeycomb",
              },
              {
                name: "Other Core Materials",
              },
              {
                name: "Syntactic Core",
              },
            ],
          },
          {
            name: "Fabrics, Unimpregnated",
            children: [
              {
                name: "Aramid",
              },
              {
                name: "Aramid/Glass Hybrid",
              },
              {
                name: "Basalt",
              },
              {
                name: "C-Glass",
              },
              {
                name: "Carbon",
              },
              {
                name: "Carbon/Aramid Hybrid",
              },
              {
                name: "Carbon/Glass Hybrid",
              },
              {
                name: "Ceramic",
              },
              {
                name: "E-Glass",
              },
              {
                name: "Metallized",
              },
              {
                name: "Other Unimpregnated Fabrics",
              },
              {
                name: "Structural High-Strength Glass",
              },
            ],
          },
          {
            name: "Fibers, Inorganic",
            children: [
              {
                name: "Aluminum",
              },
              {
                name: "Basalt",
              },
              {
                name: "Boron",
              },
              {
                name: "C-Glass",
              },
              {
                name: "Ceramic",
              },
              {
                name: "E-Glass",
              },
              {
                name: "Other Inorganic Fibers",
              },
              {
                name: "Quartz",
              },
              {
                name: "Silicon Carbide",
              },
              {
                name: "Structural High-Strength Glass (S- & R-Type)",
              },
            ],
          },
          {
            name: "Fibers, Organic",
            children: [
              {
                name: "Aramid",
              },
              {
                name: "Carbon, PAN-Based",
              },
              {
                name: "Carbon, Pitch-Based",
              },
              {
                name: "Carbon, Rayon-Based",
              },
              {
                name: "Fibers, Metallized",
              },
              {
                name: "Hybrid Commingled Fibers",
              },
              {
                name: "Lightning Strike Materials (Metal Meshes, Fabrics, Etc.)",
              },
              {
                name: "Nylon",
              },
              {
                name: "Other Organic Fibers",
              },
              {
                name: "Poly P-Phenylene-2,6-Benzobisoxazole (Pbo)",
              },
              {
                name: "Polybenzimidazole (Pbi)",
              },
              {
                name: "Polyester",
              },
              {
                name: "Polytheylene",
              },
              {
                name: "Ultrahigh-Molecular-Weight (UHMW) Polyethylene",
              },
            ],
          },
          {
            name: "Fibers/Fiber Forms, Natural (Bio-Derived)",
            children: [
              {
                name: "Abaca",
              },
              {
                name: "Coir (Coconut)",
              },
              {
                name: "Cotton",
              },
              {
                name: "Flax",
              },
              {
                name: "Hemp",
              },
              {
                name: "Jute",
              },
              {
                name: "Kapok",
              },
              {
                name: "Kenaf",
              },
              {
                name: "Other Natural Fibers",
              },
              {
                name: "Sisal",
              },
              {
                name: "Wood Flour",
              },
            ],
          },
          {
            name: "Fillers",
            children: [
              {
                name: "Alumina Trihydrate",
              },
              {
                name: "Calcium Carbonate",
              },
              {
                name: "Calcium Sulfate",
              },
              {
                name: "Carbon Black",
              },
              {
                name: "Kaolin",
              },
              {
                name: "Mica",
              },
              {
                name: "Microspheres",
              },
              {
                name: "Milled Glass Fiber",
              },
              {
                name: "Nanoclays/Nanofibers",
              },
              {
                name: "Other Fillers",
              },
              {
                name: "Recyclate",
              },
              {
                name: "Silica",
              },
              {
                name: "Talc",
              },
              {
                name: "Wollastonite",
              },
            ],
          },
          {
            name: "Gel Coats",
            children: [
              {
                name: "Anti-Fouling",
              },
              {
                name: "Chemical-/Corrosion-Resistant",
              },
              {
                name: "Conductive",
              },
              {
                name: "Fire-Retardant",
              },
              {
                name: "General-Purpose",
              },
              {
                name: "Marine",
              },
              {
                name: "Other Gel Coats",
              },
              {
                name: "Potable-Water Grades",
              },
              {
                name: "Uv-Curable",
              },
            ],
          },
          {
            name: "Matrix Materials, Other",
            children: [
              {
                name: "Ceramic",
              },
              {
                name: "Metallic",
              },
              {
                name: "Other Matrix Materials",
              },
              {
                name: "Precursors, For Carbon Fiber",
              },
            ],
          },
          {
            name: "Matrix Resins, Thermoplastic",
            children: [
              {
                name: "Acetal",
              },
              {
                name: "Acrylonitrile Butadiene Styrene (ABS)",
              },
              {
                name: "Liquid Crystal Polymer",
              },
              {
                name: "Methyl Methacrylate",
              },
              {
                name: "Nylon (Polyamide)",
              },
              {
                name: "Other Thermoplastics",
              },
              {
                name: "Polycarbonate",
              },
              {
                name: "Polyester",
              },
              {
                name: "Polyether Ketone Family (PAEK, PEKK, PEEK)",
              },
              {
                name: "Polyetherimide (PEI)",
              },
              {
                name: "Polyethersulfone",
              },
              {
                name: "Polyethylene",
              },
              {
                name: "Polyethylene Terephthalate (PET)",
              },
              {
                name: "Polyimide",
              },
              {
                name: "Polyphenylene Sulfide (PPS)",
              },
              {
                name: "Polypropylene (PP)",
              },
              {
                name: "Polyurethane (Pu)",
              },
              {
                name: "Styrene Monomer (Diluent)",
              },
            ],
          },
          {
            name: "Matrix Resins, Thermoset",
            children: [
              {
                name: "Acrylic",
              },
              {
                name: "Benzoxazine",
              },
              {
                name: "Bismaleimide (Bmi)",
              },
              {
                name: "Cyanate Ester",
              },
              {
                name: "Epoxy, 250 F Cure",
              },
              {
                name: "Epoxy, 350 F Cure",
              },
              {
                name: "Epoxy, Toughened",
              },
              {
                name: "Other Thermosets",
              },
              {
                name: "Phenolic",
              },
              {
                name: "Polyimide",
              },
              {
                name: "Unsaturated Polyester",
              },
              {
                name: "Urethane",
              },
              {
                name: "UV-Curable",
              },
              {
                name: "Vinyl Ester",
              },
            ],
          },
          {
            name: "Preforms, Impregnated",
          },
          {
            name: "Preforms, Unimpregnated",
          },
          {
            name: "Prepregs, Thermoplastic",
            children: [
              {
                name: "Commingled/Cowoven/Coserved Yarns",
              },
              {
                name: "Fabric",
              },
              {
                name: "Interlaced",
              },
              {
                name: "Mat",
              },
              {
                name: "Other Thermoplastic Prepregs",
              },
              {
                name: "Rtp Sheet (GMT)",
              },
              {
                name: "Rtp Sheet, Continuously Reinforced",
              },
              {
                name: "Self-Reinforced Polymers (Srps)",
              },
              {
                name: "Tape, Unidirectional",
              },
              {
                name: "Tow Or Roving",
              },
            ],
          },
          {
            name: "Prepregs, Thermoset",
            children: [
              {
                name: "Bismaleimide",
              },
              {
                name: "Cyanate Ester",
              },
              {
                name: "Epoxy",
              },
              {
                name: "Epoxy, 250 F Cure",
              },
              {
                name: "Epoxy, 350 F Cure",
              },
              {
                name: "Epoxy, Toughened",
              },
              {
                name: "Other",
              },
              {
                name: "Phenolic",
              },
              {
                name: "Polyester, Unsaturated",
              },
              {
                name: "Polyimide",
              },
              {
                name: "Vinyl Ester",
              },
            ],
          },
          {
            name: "Reinforcements, Unimpregnated (Dry)",
            children: [
              {
                name: "Aramid",
              },
              {
                name: "Aramid/Glass Hybrid",
              },
              {
                name: "Basalt",
              },
              {
                name: "C-Glass",
              },
              {
                name: "Carbon, Chopped Strand",
              },
              {
                name: "Carbon, Combination Woven Roving & Chopped Strand Mat",
              },
              {
                name: "Carbon, Mat, Chopped Strand",
              },
              {
                name: "Carbon, Mat, Continuous Strand",
              },
              {
                name: "Carbon, Milled Fibers",
              },
              {
                name: "Carbon, Other",
              },
              {
                name: "Carbon, Roving",
              },
              {
                name: "Carbon, Surfacing Veil",
              },
              {
                name: "Carbon, Yarns",
              },
              {
                name: "Carbon/Aramid Hybrid",
              },
              {
                name: "Carbon/Glass Hybrid",
              },
              {
                name: "Ceramic",
              },
              {
                name: "E-Glass",
              },
              {
                name: "Other Unimpregnated Reinforcement Forms",
              },
              {
                name: "Structural High-Strength Glass",
              },
            ],
          },
          {
            name: "Resin Additives & Modifiers",
            children: [
              {
                name: "Ablatives",
              },
              {
                name: "Colorant, Pigments",
              },
              {
                name: "Conductive Fillers",
              },
              {
                name: "Coupling Agents",
              },
              {
                name: "Flame/Smoke-Suppressant Additives",
              },
              {
                name: "Foaming Agents",
              },
              {
                name: "Low-Profile Additives",
              },
              {
                name: "Nanomaterials (Carbon Nanotubes, Fullerenes, Etc.)",
              },
              {
                name: "Other Additives/Modifiers",
              },
              {
                name: "Styrene-Suppressant Additives",
              },
              {
                name: "Thickening Agents",
              },
              {
                name: "Toughening Agents",
              },
              {
                name: "Uv Stabilizers",
              },
              {
                name: "Viscosity Control Agents",
              },
            ],
          },
        ],
      },
      {
        name: "Metals - Ferrous",
        children: [
          {
            name: "Carbon, Alloy & Free Machining Steels",
          },
          {
            name: "Cast Irons",
          },
          {
            name: "Nickel Alloys",
          },
          {
            name: "Other Ferrous Metals",
          },
          {
            name: "Powder Metals",
          },
          {
            name: "Stainless Steels",
          },
          {
            name: "Tool Steels",
          },
        ],
      },
      {
        name: "Metals - Non-Ferrous",
        children: [
          {
            name: "Aluminum",
          },
          {
            name: "Brass & Copper Alloys",
          },
          {
            name: "Other Non-Ferrous Materials",
          },
          {
            name: "Proofing Materials (Wax,Etc.)",
          },
          {
            name: "Titanium Alloys",
          },
        ],
      },
      {
        name: "Mold Materials",
        children: [
          {
            name: "Aluminum Alloys",
          },
          {
            name: "Aluminum Cast Plate",
          },
          {
            name: "Beryllium Copper",
          },
          {
            name: "Beryllium Copper Substitute Alloys",
          },
          {
            name: "Brass",
          },
          {
            name: "Bronze",
          },
          {
            name: "Copper Alloys",
          },
          {
            name: "Foams",
          },
          {
            name: "Liquid Rubber",
          },
          {
            name: "Polyurethane Prepolymers",
          },
          {
            name: "Stainless Steel",
          },
          {
            name: "Tool Steel/Mold Steel",
          },
        ],
      },
      {
        name: "Plastics Processing Resins & Additives",
        children: [
          {
            name: "Additives",
          },
          {
            name: "Other Materials",
            children: [
              {
                name: "Additive Manufacturing (3D Printing/Prototyping Materials)",
              },
              {
                name: "Biodegradable, Photodegradable Resins & Compounds",
              },
              {
                name: "Core Materials",
              },
              {
                name: "Recycled/Reprocessed Materials - Bale or Bulk",
              },
              {
                name: "Recycled/Reprocessed Materials - Ground Flake",
              },
              {
                name: "Recycled/Reprocessed Materials -Pelletized",
              },
              {
                name: "Stock Shapes - Film, Rod, Tube, Sheet",
              },
            ],
          },
          {
            name: "Thermoplastics",
            children: [
              {
                name: "ABS (and ABS/PVC Alloy)",
              },
              {
                name: "Acetal",
              },
              {
                name: "Acrylic Copolymers",
              },
              {
                name: "Acrylic/Polycarbonate Alloy",
              },
              {
                name: "Acrylic/PVC Alloy",
              },
              {
                name: "Acrylics",
              },
              {
                name: "Acrylonitrile Copolymers",
              },
              {
                name: "ASA Copolymers & Alloys",
              },
              {
                name: "Cellulose Acetate",
              },
              {
                name: "Cellulose Acetate (Butyrate & Propionate)",
              },
              {
                name: "Cyclo-olefin Polymers",
              },
              {
                name: "Ethylene Copolymers & Alloys - Other",
              },
              {
                name: "Ethylene Plastomers",
              },
              {
                name: "Ethylene Vinyl Acetate (EVA)",
              },
              {
                name: "Ethylene Vinyl Alcohol (EVOH)",
              },
              {
                name: "Expandable Polyolefin Bead",
              },
              {
                name: "Fluoropolymers",
              },
              {
                name: "Ionomers",
              },
              {
                name: "Liquid Crystal Polymers",
              },
              {
                name: "Nylon - Amorphous",
              },
              {
                name: "Nylon - Type 11",
              },
              {
                name: "Nylon - Type 12",
              },
              {
                name: "Nylon - Type 46",
              },
              {
                name: "Nylon - Type 6",
              },
              {
                name: "Nylon - Type 6/66 Copolymer",
              },
              {
                name: "Nylon - Type 610",
              },
              {
                name: "Nylon - Type 612",
              },
              {
                name: "Nylon - Type 66",
              },
              {
                name: "Nylon - Type 69",
              },
              {
                name: "Nylon - Type Mxd6",
              },
              {
                name: "Nylon/ABS Alloys",
              },
              {
                name: "Nylon/Polypropylene Alloys",
              },
              {
                name: "Nylons - Other",
              },
              {
                name: "PHA, PHBV Biopolymers",
              },
              {
                name: "Phenoxy",
              },
              {
                name: "Polyamide-imide",
              },
              {
                name: "Polyamide, Aromatic",
              },
              {
                name: "Polyarylate",
              },
              {
                name: "Polyarylether",
              },
              {
                name: "Polyarylsulfone",
              },
              {
                name: "Polybenzimidazole",
              },
              {
                name: "Polybutylene",
              },
              {
                name: "Polycarbonate",
              },
              {
                name: "Polycarbonate/ABS Alloys",
              },
              {
                name: "Polycarbonate/Polyester Alloy",
              },
              {
                name: "Polyester (Thermoplastic) - Other Types",
              },
              {
                name: "Polyester (Thermoplastic) - PCT Type",
              },
              {
                name: "Polyester (Thermoplastic) - PCTA Type",
              },
              {
                name: "Polyester (Thermoplastic) - PCTG Type",
              },
              {
                name: "Polyester (Thermoplastic) - PET Type",
              },
              {
                name: "Polyester (Thermoplastic) - PETG Type",
              },
              {
                name: "Polyester (Thermoplastic) - PTT Type",
              },
              {
                name: "Polyester (Thermoplastic) -PBT Type",
              },
              {
                name: "Polyestercarbonate",
              },
              {
                name: "Polyetheretheketone (PEEK), Polyetherketone (PEK)  & Other Polyketones",
              },
              {
                name: "Polyetherimide",
              },
              {
                name: "Polyethersulfone",
              },
              {
                name: "Polyethylene - Adhesion Modified",
              },
              {
                name: "Polyethylene - HDPE",
              },
              {
                name: "Polyethylene - LDPE",
              },
              {
                name: "Polyethylene - LLDPE",
              },
              {
                name: "Polyethylene - MDPE",
              },
              {
                name: "Polyethylene - UHMW PE",
              },
              {
                name: "Polyethylene - ULDPE/VLDPE",
              },
              {
                name: "Polyimide (Thermoplastic)",
              },
              {
                name: "Polylactide (PLA) Polymers",
              },
              {
                name: "Polymethylpentene",
              },
              {
                name: "Polyphenylene Ether/Oxide-Based Resins",
              },
              {
                name: "Polyphenylene Sulfide (PPS)",
              },
              {
                name: "Polyphenylsulfone",
              },
              {
                name: "Polyphosphonate",
              },
              {
                name: "Polyphthalamide (PPA)",
              },
              {
                name: "Polypropylene (including Copolymers)",
              },
              {
                name: "Polystyrene & Styrene Copolymers",
              },
              {
                name: "Polysulfone",
              },
              {
                name: "Prepregs (thermoplastic)",
              },
              {
                name: "PVC - Chlorinated PVC (CPVC)",
              },
              {
                name: "PVC - Copolymer Resins",
              },
              {
                name: "PVC - Dispersion & Blending Resins",
              },
              {
                name: "PVC - Flexible Compounds",
              },
              {
                name: "PVC - Plastisols, Organosols",
              },
              {
                name: "PVC - Rigid Compounds",
              },
              {
                name: "PVC - Suspension or Mass General-Purpose Resins",
              },
              {
                name: "PVDC",
              },
              {
                name: "Starch-based Polymers",
              },
              {
                name: "Syndiotactic Polystyrene (SPS)",
              },
              {
                name: "Thermoplastic Elastomers",
              },
            ],
          },
        ],
      },
      {
        name: "Tooling Materials",
        children: [
          {
            name: "Carbides",
          },
          {
            name: "Ceramics",
          },
        ],
      },
    ],
  },
  {
    name: "Metalworking",
    children: [
      {
        name: "Cutting Tools",
        children: [
          {
            name: "Abrasive Compounds & Slurries",
          },
          {
            name: "Arbors (for Cutters)",
          },
          {
            name: "Boring Tools",
          },
          {
            name: "Boring Tools & Heads for Machining Centers",
          },
          {
            name: "Boring Tools for Turning Machines",
          },
          {
            name: "Broaching Tools",
          },
          {
            name: "Buffing & Polishing Supplies",
          },
          {
            name: "Burnishing Tools (Roller)",
          },
          {
            name: "Burnishing, Honing & Lapping Tools",
          },
          {
            name: "Chamfering Tools",
          },
          {
            name: "Collets for Toolholding",
          },
          {
            name: "Collets, Solid & Master",
          },
          {
            name: "Counterbores/Countersinks",
          },
          {
            name: "Cut-Off Tools/Attachments",
          },
          {
            name: "Cutting Tools (General)",
          },
          {
            name: "Deburring Tools (Machine Tool Spindle-Mounted)",
          },
          {
            name: "Diamond Tools",
          },
          {
            name: "Die & Mold Components",
          },
          {
            name: "Drill Bushings",
          },
          {
            name: "Drill Chucks",
          },
          {
            name: "Drilling Heads/Attachments",
          },
          {
            name: "Drills",
          },
          {
            name: "End Mills",
          },
          {
            name: "Endworking Tools",
          },
          {
            name: "Facing Tools/Heads",
          },
          {
            name: "Form Tools",
          },
          {
            name: "Gear Cutting & Rolling Tools",
          },
          {
            name: "Grinding Wheel Dressing Units",
          },
          {
            name: "Grinding Wheels & Belts",
          },
          {
            name: "Grooving Tools",
          },
          {
            name: "Gundrills",
          },
          {
            name: "Honing & Lapping Tools",
          },
          {
            name: "Inserts, Indexable (Carbide, etc.) & Tool Inserts",
          },
          {
            name: "Key Seating Tools",
          },
          {
            name: "Knurling Tools",
          },
          {
            name: "Marking Tools",
          },
          {
            name: "Mass Finishing Media & Compounds",
          },
          {
            name: "Milling Cutters",
          },
          {
            name: "Milling Heads/Attachments",
          },
          {
            name: "Protective Sleeves & Coatings (for Cutting Tools)",
          },
          {
            name: "Punching Tools/Dies",
          },
          {
            name: "Reamers",
          },
          {
            name: "Retention Knobs",
          },
          {
            name: "Saw Blades",
          },
          {
            name: "Serration Tooling",
          },
          {
            name: "Shaving Tools",
          },
          {
            name: "Shear Blades",
          },
          {
            name: "Slotting Saws",
          },
          {
            name: "Spline Inserts",
          },
          {
            name: "Spline Rolling Tools",
          },
          {
            name: "Tap Drivers & Attachments",
          },
          {
            name: "Taps",
          },
          {
            name: "Thread Chasers",
          },
          {
            name: "Thread Milling Cutters",
          },
          {
            name: "Thread Rolls & Dies",
          },
          {
            name: "Thread Whirling Tools",
          },
          {
            name: "Threading Tools",
          },
          {
            name: "Threading Tools - Cutting",
          },
          {
            name: "Threading Tools - Forming",
          },
          {
            name: "Tool Blanks",
          },
          {
            name: "Tool Conditioning & Monitoring",
          },
          {
            name: "Tool Presetters",
          },
          {
            name: "Tool Repair, Coating & Treatment Services",
          },
          {
            name: "Tool Storage & Handling Systems",
          },
          {
            name: "Toolholders",
          },
          {
            name: "Tooling Materials, Carbides",
          },
          {
            name: "Tooling Materials, Ceramics",
          },
          {
            name: "Tooling Systems, Modular and/or Quick-Change",
          },
        ],
      },
      {
        name: "Forming & Fabricating",
        children: [
          {
            name: "Bending & Rolling Machines",
            children: [
              {
                name: "Coil Handling, Feeding, Straightening & Uncoiling Machines",
              },
              {
                name: "Pipe & Tube Bending Machines",
              },
              {
                name: "Profile Rolling Machines",
              },
              {
                name: "Roll Forming & Bending Machines",
              },
              {
                name: "Wire Forming Machines",
              },
            ],
          },
          {
            name: "Hot & Cold Forming Machines",
          },
          {
            name: "Lasers, Waterjet & Plasma Machines",
            children: [
              {
                name: "Laser Accessories & Supplies",
              },
              {
                name: "Laser Cutting Systems",
              },
              {
                name: "Plasma-Arc/Plasma Cutting Machines",
              },
              {
                name: "Waterjet Cutting Machines",
              },
            ],
          },
          {
            name: "Press Brakes & Shears",
          },
          {
            name: "Presses",
          },
          {
            name: "Special Purpose Forming & Fabricating Equipment",
          },
          {
            name: "Welding & Related Equipment",
          },
        ],
      },
      {
        name: "Machine Tool Components & Accessories",
        children: [
          {
            name: "Fixtures & Storage",
            children: [
              {
                name: "Machine Castings & Weldments",
              },
              {
                name: "Magnets & Magnetic Devices of all Kinds",
              },
              {
                name: "Pallets, Tote Boxes & Separators",
              },
              {
                name: "Protective Enclosures & Covers",
              },
            ],
          },
          {
            name: "Fluid Handling & Lubrication",
            children: [
              {
                name: "Coolant Delivery Systems",
              },
              {
                name: "Hydraulic & Pneumatic Equipment",
              },
              {
                name: "Lubricators",
              },
              {
                name: "Minimum Quantity Lubrication (MQL) Systems",
              },
              {
                name: "Pumps, Coolant",
              },
            ],
          },
          {
            name: "Linear Motion & Positioning",
            children: [
              {
                name: "Encoders/Resolvers",
              },
              {
                name: "Linear Guides",
              },
              {
                name: "Linear Scales",
              },
              {
                name: "On-Machine Probes",
              },
              {
                name: "Slides",
              },
            ],
          },
          {
            name: "Machine Interface & Safety",
            children: [
              {
                name: "Handwheels, Knobs, Cranks, etc.",
              },
              {
                name: "Lights, Indicator & Warning",
              },
              {
                name: "Nameplates, Labels & Signs",
              },
            ],
          },
          {
            name: "Machine Structure & Stability",
            children: [
              {
                name: "Fasteners",
              },
              {
                name: "Machinery Mountings, Levels, Anchors, Dampers",
              },
              {
                name: "Springs",
              },
              {
                name: "Way Covers, Way Protectors & Seals",
              },
            ],
          },
          {
            name: "Motion Control & Power Transmission",
            children: [
              {
                name: "Ball/Lead Screws & Repair Services",
              },
              {
                name: "Bearings, Pulleys, Clutches, Gears & V-Belts",
              },
              {
                name: "Couplings",
              },
              {
                name: "Non-Servo Electric Motors (Including Spindles, Drive Units & Power Feeds)",
              },
              {
                name: "Servo Motors",
              },
              {
                name: "Speed Reducers & Gear Boxes",
              },
              {
                name: "Spindles",
              },
            ],
          },
          {
            name: "Tooling & Automation",
            children: [
              {
                name: "Chip Conveyors & Handling Equipment",
              },
              {
                name: "Tool Turrets",
              },
              {
                name: "Toolchangers",
              },
            ],
          },
        ],
      },
      {
        name: "Metal Cutting Machine Tools & Equipment",
        children: [
          {
            name: "Broaching, Slotting & Shaping Equipment",
            children: [
              {
                name: "Broaching Tools",
              },
              {
                name: "Continuous Broaching Machines",
              },
              {
                name: "Horizontal Broaching Machines",
              },
              {
                name: "Internal Broaching Machines",
              },
              {
                name: "Key Seaters & Tools",
              },
              {
                name: "Shaping & Slotting Machines",
              },
              {
                name: "Vertical Broaching Machines",
              },
            ],
          },
          {
            name: "Drilling & Tapping",
            children: [
              {
                name: "Bench & Column Drilling Machines",
              },
              {
                name: "Deep Hole Drilling Machines (Gun Drilling)",
              },
              {
                name: "Fixtured Drilling & Tapping Units",
              },
              {
                name: "Multi-Spindle Drilling Machines",
              },
              {
                name: "Radial Arm Drilling Machines",
              },
            ],
          },
          {
            name: "EDM",
            children: [
              {
                name: "EDM Filtration Equipment & Supplies",
              },
              {
                name: "EDM Services",
              },
              {
                name: "EDM Tooling & Fixtures",
              },
              {
                name: "Electrode Materials, EDM Wire & Supplies",
              },
              {
                name: "Ram Type (Die-Sinking) CNC EDM",
              },
              {
                name: "Ram Type (Die-Sinking) Manual EDM",
              },
              {
                name: "Small Hole EDM",
              },
              {
                name: "Wire Type EDM",
              },
            ],
          },
          {
            name: "Gear Cutting & Inspection",
            children: [
              {
                name: "Gear Cutting Tools",
              },
              {
                name: "Gear Deburring Machines",
              },
              {
                name: "Gear Generation (Bevel) Machines",
              },
              {
                name: "Gear Grinding Machines",
              },
              {
                name: "Gear Hobbing Machines",
              },
              {
                name: "Gear Honing Machines",
              },
              {
                name: "Gear Inspection Equipment",
              },
              {
                name: "Gear Lapping Machines",
              },
              {
                name: "Gear Rolling Machines",
              },
              {
                name: "Gear Shaping Machines",
              },
              {
                name: "Gear Shaving Machines",
              },
            ],
          },
          {
            name: "Grinding Machines & Equipment",
            children: [
              {
                name: "Abrasive Belt",
              },
              {
                name: "Attachments & Accessories",
              },
              {
                name: "Centerless",
              },
              {
                name: "Creep Feed",
              },
              {
                name: "Cylindrical OD",
              },
              {
                name: "Disc, Single or Double",
              },
              {
                name: "Gear Grinding Machines",
              },
              {
                name: "Grinding Machines (General)",
              },
              {
                name: "Grinding Wheel Dressing Units",
              },
              {
                name: "Internal Cylindrical",
              },
              {
                name: "Jig",
              },
              {
                name: "Profile",
              },
              {
                name: "Superabrasive Machining Systems",
              },
              {
                name: "Surface, Reciprocal Table",
              },
              {
                name: "Surface, Rotary Table",
              },
              {
                name: "Thread",
              },
              {
                name: "Tool, Cutter & Drill Point",
              },
              {
                name: "Universal (ID/OD)",
              },
              {
                name: "Wheels & Belts",
              },
            ],
          },
          {
            name: "Machining Centers & Systems",
            children: [
              {
                name: "Machining Cells & Systems",
                children: [
                  {
                    name: "Assembly & Testing Automation",
                  },
                  {
                    name: "Automated for Material Joining",
                  },
                  {
                    name: "Machining Cells & FMS",
                  },
                  {
                    name: "Machining Flex Lines",
                  },
                  {
                    name: "Material Forming & Fabricating Automation",
                  },
                  {
                    name: "Material Removal Automation",
                  },
                  {
                    name: "Multi-Machine Tool-Storage Systems",
                  },
                  {
                    name: "Pallet Systems",
                  },
                ],
              },
              {
                name: "Machining Centers",
                children: [
                  {
                    name: "High Speed Machining Centers",
                  },
                  {
                    name: "Horizontal, Five-Axis",
                  },
                  {
                    name: "Horizontal, Up to Four-Axis",
                  },
                  {
                    name: "Universal",
                  },
                  {
                    name: "Vertical, Up to Four-Axis",
                  },
                ],
              },
              {
                name: "Milling & Boring Machines",
                children: [
                  {
                    name: "Bed-Type Milling",
                  },
                  {
                    name: "Boring",
                  },
                  {
                    name: "Graphite Milling",
                  },
                  {
                    name: "Jig Boring",
                  },
                  {
                    name: "Knee & Column Milling, Non-ATC",
                  },
                  {
                    name: "Nano & Micro Machining",
                  },
                  {
                    name: "Planer, Gantry & Bridge Type Milling",
                  },
                  {
                    name: "Ultrasonic",
                  },
                  {
                    name: "Universal Milling Machines",
                  },
                ],
              },
            ],
          },
          {
            name: "Sawing & Cut-Off",
            children: [
              {
                name: "Abrasive Cut-Off Machines",
              },
              {
                name: "Bandsaws",
              },
              {
                name: "Circular Cut-Off Saws (Cold)",
              },
              {
                name: "Saw Blades",
              },
            ],
          },
          {
            name: "Screw Machines",
            children: [
              {
                name: "Cams & Related Equipment",
              },
              {
                name: "Multi-Spindle Screw Machines",
                children: [
                  {
                    name: "Cam-Type Multi-Spindle Screw Machines",
                  },
                  {
                    name: "CNC Multi-Spindle Screw Machines",
                  },
                ],
              },
              {
                name: "Screw Machine Attachments",
                children: [
                  {
                    name: "Cutting & Shaping",
                  },
                  {
                    name: "Drilling, Reaming, & Tapping",
                  },
                  {
                    name: "Forming & Finishing",
                  },
                  {
                    name: "Specialty & Auxiliary",
                  },
                  {
                    name: "Turning & Threading",
                  },
                ],
              },
              {
                name: "Single-Spindle Screw Machines",
                children: [
                  {
                    name: "Cam-Type Single-Spindle Screw Machines",
                  },
                  {
                    name: "CNC Single-Spindle Screw Machines",
                  },
                ],
              },
              {
                name: "Swiss-Type Screw Machines",
                children: [
                  {
                    name: "Cam-Type Swiss Screw Machines",
                  },
                  {
                    name: "CNC Swiss Screw Machines",
                  },
                ],
              },
            ],
          },
          {
            name: "Threading Machines",
            children: [
              {
                name: "Pipe & Bar Threading & Cut-Off Machines",
              },
              {
                name: "Thread Cutting",
              },
              {
                name: "Thread Rolling",
              },
            ],
          },
          {
            name: "Transfer Machines",
            children: [
              {
                name: "Dial Index",
              },
              {
                name: "In-Line",
              },
              {
                name: "Machining Flex Lines",
              },
              {
                name: "Rotary",
              },
              {
                name: "Shuttle-Type",
              },
              {
                name: "Trunnion",
              },
            ],
          },
          {
            name: "Turning Machines & Lathes",
            children: [
              {
                name: "CNC Turn/Mill Machines",
              },
              {
                name: "Cut-off Lathes",
              },
              {
                name: "End Turning Machines",
              },
              {
                name: "Horizontal CNC Turning",
              },
              {
                name: "Inverted Vertical CNC Turning",
              },
              {
                name: "Lathe Tooling & Accessories",
              },
              {
                name: "Lathes",
              },
              {
                name: "Twin-Spindle/Twin-Turret Turning",
              },
              {
                name: "Vertical CNC Turning Centers",
              },
            ],
          },
        ],
      },
      {
        name: "Metalworking Fluids",
        children: [
          {
            name: "Coolants, Cutting Fluids & Oils",
          },
          {
            name: "Degreasers, Solvent & Vapor",
          },
          {
            name: "Lubricants & Greases",
          },
        ],
      },
    ],
  },
  {
    name: "Mold Making",
    children: [
      {
        name: "Hot Runner Systems & Supplies",
        children: [
          {
            name: "Hot Halves",
          },
          {
            name: "Hot Runner Manifolds",
          },
          {
            name: "Hydraulic Valve Gate Nozzles",
          },
          {
            name: "Mechanical Valve Gate Nozzles",
          },
          {
            name: "Pneumatic Valve Gate Nozzles",
          },
          {
            name: "Servo Valve Gate Nozzles",
          },
          {
            name: "Temperature Controls, Monitors, Sensors",
          },
          {
            name: "Thermal Edge Gate Nozzles",
          },
          {
            name: "Thermal Hot Tip Nozzles",
          },
          {
            name: "Thermal Multi-Gate Nozzles",
          },
          {
            name: "Valve Gate Controllers",
          },
          {
            name: "Valve Gate Sequencers",
          },
        ],
      },
      {
        name: "Mold Components",
        children: [
          {
            name: "Blades",
          },
          {
            name: "Bushings",
          },
          {
            name: "Cooling Systems",
          },
          {
            name: "Core Pins",
          },
          {
            name: "Counters",
          },
          {
            name: "Date Inserts",
          },
          {
            name: "Ejector Pins, or 'Knock-Out Pins'",
          },
          {
            name: "Fixtures",
          },
          {
            name: "Gaskets",
          },
          {
            name: "Gate Inserts",
          },
          {
            name: "Gears",
          },
          {
            name: "Guides",
          },
          {
            name: "Interlocks, or Taperlocks",
          },
          {
            name: "Internal Mold Cooling Products",
          },
          {
            name: "Jigs",
          },
          {
            name: "Leader Pins",
          },
          {
            name: "Lifters",
          },
          {
            name: "Locating Rings",
          },
          {
            name: "Mold Bases & Frames",
          },
          {
            name: "Mold Insulation",
          },
          {
            name: "Mold Monitoring Devices",
          },
          {
            name: "Mold Wiring",
          },
          {
            name: "O-Rings",
          },
          {
            name: "Quick Mold Change Systems",
          },
          {
            name: "Side Actions or Cam Actions",
          },
          {
            name: "Slides",
          },
          {
            name: "Socket Head Cap",
          },
          {
            name: "Sprue Bushings",
          },
          {
            name: "Stop Pins",
          },
          {
            name: "Straight Locks",
          },
          {
            name: "Support Pillars",
          },
          {
            name: "Switches or Indicators",
          },
          {
            name: "Thermal Pin/Heat Pipes",
          },
          {
            name: "Wear Plates",
          },
        ],
      },
      {
        name: "Mold Maintenance, Repair & Surface Treatment",
        children: [
          {
            name: "Electron-Beam Welding Machines",
          },
          {
            name: "Engraving Equipment",
          },
          {
            name: "Finishing Services",
          },
          {
            name: "Heat Treating Services",
          },
          {
            name: "Heat Treating, Hardening Systems",
          },
          {
            name: "Manual Cleaning Equipment",
          },
          {
            name: "Mold Cleaning Services",
          },
          {
            name: "Mold Dehumidification Systems",
          },
          {
            name: "Mold Finishing Systems",
          },
          {
            name: "Mold Maintenance & Repair Services",
          },
          {
            name: "Mold Sprays, Grease, Lubricants & Releases",
          },
          {
            name: "Mold Texturing, Engraving  Services",
          },
          {
            name: "Mold Transporters",
          },
          {
            name: "Mold Treatment Systems",
          },
          {
            name: "Mold Tryout Equipment",
          },
          {
            name: "Mold/Die Spotting Presses",
          },
          {
            name: "Polishing Equipment & Supplies",
          },
          {
            name: "Polishing Services",
          },
          {
            name: "Pry Bars",
          },
          {
            name: "Replacement Parts",
          },
          {
            name: "Retrofitting, Rebuilding, Remanufacturing Services",
          },
          {
            name: "Sampling/Mold Tryout Services",
          },
          {
            name: "Scrap Recycling Equipment",
          },
          {
            name: "Scrapers",
          },
          {
            name: "Texturing Equipment",
          },
          {
            name: "Welding & Related Equipment",
          },
          {
            name: "Welding Services",
          },
        ],
      },
      {
        name: "Moldmaking Equipment & Accessories",
        children: [
          {
            name: "Air & Hydraulic Cylinders",
          },
          {
            name: "Air Grinders",
          },
          {
            name: "Chillers",
          },
          {
            name: "Dust & Odor Control",
          },
          {
            name: "Heat Transfer Fluids",
          },
          {
            name: "Isolation Pads",
          },
          {
            name: "Levelers",
          },
          {
            name: "Mold Flow & Simulation Software",
          },
          {
            name: "Mold Insulation",
          },
          {
            name: "Mounted Points",
          },
          {
            name: "Power & Thermocouple Cables",
          },
          {
            name: "Process Controllers",
          },
          {
            name: "Setup Cart",
          },
          {
            name: "Trimmers",
          },
        ],
      },
      {
        name: "Molds/Tools/Dies",
        children: [
          {
            name: "Blow Molds",
          },
          {
            name: "Compression Molds",
          },
          {
            name: "Die Cast Dies",
          },
          {
            name: "Extrusion Blow Molds",
          },
          {
            name: "Extrusion Molds",
          },
          {
            name: "Foam Molds",
          },
          {
            name: "Injection Molds",
          },
          {
            name: "Liquid Injection Blow Molds",
          },
          {
            name: "Stretch Blow Molds",
          },
          {
            name: "Thermoform Molds",
          },
        ],
      },
    ],
  },
  {
    name: "Plastics Processing Equipment",
    children: [
      {
        name: "Auxiliary Equipment",
        children: [
          {
            name: "Adhesive Bonding Equipment",
          },
          {
            name: "Assembly Systems",
          },
          {
            name: "Bag-Making Machinery",
          },
          {
            name: "Bending, Heat-forming Equipment",
          },
          {
            name: "Deflashing Media & Equipment (for Thermosets)",
          },
          {
            name: "Degating Equipment",
          },
          {
            name: "Fluid-jet Cutting Systems",
          },
          {
            name: "Machining, Drilling, Routing Equipment",
          },
          {
            name: "Mold Dehumidification Systems",
          },
          {
            name: "Optical Inspection Systems",
          },
          {
            name: "Preheaters for Materials",
          },
          {
            name: "PT1479 Drives & Motors (12) [0]",
          },
          {
            name: "PT1656 Stereolithography Systems (1) [4]",
          },
          {
            name: "PT1842 Gas & Water Injection Systems (4) [0]",
          },
          {
            name: "PT2188 Flame Treaters (7) [1]",
          },
          {
            name: "PT4802 Lip Rollers (3) [2]",
          },
          {
            name: "PT5039 Electrostatic Charging Equipment (7) [2]",
          },
          {
            name: "PT5327 Electron-beam Processing Equipment (1) [1]",
          },
          {
            name: "Pumps - Liquid Additive",
          },
          {
            name: "Rolls - Rubber & Nonrubber Covered",
          },
          {
            name: "Scrap Reclaim Systems",
          },
          {
            name: "Static Eliminators",
          },
          {
            name: "Ultrasonic Cutters",
          },
          {
            name: "Vision Systems",
          },
        ],
      },
      {
        name: "Chemicals & Additives",
        children: [
          {
            name: "Other Chemicals & Additives",
            children: [
              {
                name: "Air Release Agents",
              },
              {
                name: "Antiblocking Agents & Concentrates",
              },
              {
                name: "Antifogging Agents",
              },
              {
                name: "Antioxidants & Concentrates",
              },
              {
                name: "Antistats & Concentrates",
              },
              {
                name: "Biocides",
              },
              {
                name: "Blowing Agents (Chemical, Physical, Concentrates)",
              },
              {
                name: "Color Concentrates",
              },
              {
                name: "Color Dyes, Pigments",
              },
              {
                name: "Compatibilizers",
              },
              {
                name: "Conductive Additives",
              },
              {
                name: "Cooling-Water Treatment Chemicals",
              },
              {
                name: "Crosslinking Agents for Thermoplastics",
              },
              {
                name: "Degradation Promoters",
              },
              {
                name: "Dessicant Additives",
              },
              {
                name: "Fillers - Mineral or Other Inorganic Type",
              },
              {
                name: "Fillers -Microspheres (Hollow or Solid)",
              },
              {
                name: "Fillers -Organic Type",
              },
              {
                name: "Flame Retardants & Smoke Suppressants",
              },
              {
                name: "Fragrance Additives",
              },
              {
                name: "Heat Stabilizers for PVC",
              },
              {
                name: "Heat-Distortion Modifiers",
              },
              {
                name: "Impact Modifiers",
              },
              {
                name: "Lubricants & Lubricant Concentrates",
              },
              {
                name: "Metal Deactivators",
              },
              {
                name: "Nucleating/Clarifying Agents",
              },
              {
                name: "Odor Neutralizers",
              },
              {
                name: "Plasticizers",
              },
              {
                name: "Processing Aids (Organic & Inorganic)",
              },
              {
                name: "Purging Compounds",
              },
              {
                name: "Release Agents (External & Internal/Additive)",
              },
              {
                name: "Slip Agents & Concentrates",
              },
              {
                name: "Stripping Agents, Resin Removers",
              },
              {
                name: "Surface Treatment Chemicals, Dispersion Aids (for Fillers, Pigments, Reinforcements)",
              },
              {
                name: "Surfactants",
              },
              {
                name: "Thixotropic Agents",
              },
              {
                name: "UV Stabilizers & Concentrates",
              },
              {
                name: "Viscocity Depressants",
              },
            ],
          },
          {
            name: "Reinforcements",
            children: [
              {
                name: "Aramid Fiber",
              },
              {
                name: "Carbon or Graphite Fiber",
              },
              {
                name: "Ceramic Fibers",
              },
              {
                name: "Continuous Fiber Rovings, Tows, Yarns",
              },
              {
                name: "Discontinuous Fibers (Chopped, Milled, Staple)",
              },
              {
                name: "Fabric, Mat, Veil, Felt",
              },
              {
                name: "Glass Fiber",
              },
              {
                name: "Mineral Fiber",
              },
              {
                name: "Natural Fibers",
              },
              {
                name: "Nylon, PET or PP Fiber",
              },
              {
                name: "UHMW-PE Fiber",
              },
            ],
          },
        ],
      },
      {
        name: "Extrusion & Compounding Systems",
        children: [
          {
            name: "Coating Machines (for Packaging)",
            children: [
              {
                name: "Curtain Coaters",
              },
              {
                name: "Knife Coaters",
              },
              {
                name: "Plasma Coating Systems",
              },
              {
                name: "Roll Coaters",
              },
              {
                name: "Slot Orifice Coaters",
              },
            ],
          },
          {
            name: "Dies",
            children: [
              {
                name: "Coextrusion Dies, Feedblocks",
              },
              {
                name: "Extrusion Dies",
              },
            ],
          },
          {
            name: "Extruders",
            children: [
              {
                name: "Multiple-Screw Extruders",
              },
              {
                name: "Plastic Lumber Extrusion/Molding Systems",
              },
              {
                name: "Ram Extruders",
              },
              {
                name: "Rotary Screwless Extruders",
              },
              {
                name: "Single-Screw Extruders",
              },
            ],
          },
          {
            name: "Other Extrusion Equipment",
            children: [
              {
                name: "Air Knife Equipment",
              },
              {
                name: "Air Rings & Internal Bubble Cooling Units",
              },
              {
                name: "Calenders",
              },
              {
                name: "Cutoff Equipment",
              },
              {
                name: "Dispensing Equipment for Reactive Resin Systems",
              },
              {
                name: "Extruder Screens, Screen Packs, Screen Changers, Breaker Plates, Other Melt-Filtration Equipment",
              },
              {
                name: "Film Take-off Systems",
              },
              {
                name: "Film, Sheet, Coated Web Thickness Measuring Equipment",
              },
              {
                name: "Melt Pumps for Extrusion",
              },
              {
                name: "Monofilament/Multifilament Take-Off Systems",
              },
              {
                name: "Orientation & Tentering Equipment (for Webs)",
              },
              {
                name: "Pelletizers",
              },
              {
                name: "Pipe Bellers",
              },
              {
                name: "Pipe Corrugators",
              },
              {
                name: "Pipe Take-off Systems",
              },
              {
                name: "Pipe Thickness Measuring Equipment",
              },
              {
                name: "Profiles, Tubing, Hose Take-off Systems",
              },
              {
                name: "Profiles, Tubing, Wire Thickness Measuring Equipment",
              },
              {
                name: "Saws",
              },
              {
                name: "Sheet Take-off Systems",
              },
              {
                name: "Solution Casting Equipment (for Film)",
              },
              {
                name: "Web Brakes, Clutches, Chucks",
              },
              {
                name: "Web Cleaning Equipment",
              },
              {
                name: "Web Guides, Edge Detectors",
              },
              {
                name: "Web Inspection Systems",
              },
              {
                name: "Web Slitter/Rewinders",
              },
              {
                name: "Web Slitters",
              },
              {
                name: "Web Tension Controls",
              },
              {
                name: "Web Winders, Unwinds, Rewinds",
              },
              {
                name: "Wire & Cable Take-off Systems",
              },
            ],
          },
        ],
      },
      {
        name: "Filtering, Screening Materials & Equipment",
        children: [
          {
            name: "Liquid Resin Filtration Materials, Equipment",
          },
          {
            name: "Particle Screeners, Classifiers, Separators",
          },
        ],
      },
      {
        name: "Injection & Other Molding/Forming Equipment",
      },
      {
        name: "Mixing, Blending & Compounding Equipment",
        children: [
          {
            name: "Blenders (non-intensive)",
          },
          {
            name: "Intensive Fluxing (melting) Mixers",
          },
          {
            name: "Intensive Nonfluxing Mixers",
          },
          {
            name: "Liquid Mixers",
          },
          {
            name: "Motionless Mixers",
          },
          {
            name: "Roll Mills",
          },
          {
            name: "Tumblers",
          },
        ],
      },
      {
        name: "Size Reduction Equipment",
        children: [
          {
            name: "Densifiers",
          },
          {
            name: "Dicers",
          },
          {
            name: "Granulators",
          },
          {
            name: "Knives for Granulators, Pelletizers",
          },
          {
            name: "Pulverizers",
          },
          {
            name: "Shredders, Guillotines",
          },
        ],
      },
      {
        name: "Used Machinery",
      },
      {
        name: "Welding & Sealing Equipment",
      },
    ],
  },
  {
    name: "Pollution Control & Sustainability",
    children: [
      {
        name: "Air Quality Control",
        children: [
          {
            name: "Air Quality Control & Filtration Systems, Testing  & Engineering",
          },
          {
            name: "Dust & Odor Control",
          },
          {
            name: "Emission Control Devices",
          },
          {
            name: "Exhaust & Ventilation Systems",
          },
          {
            name: "Pollution Control Equipment (Catalytic Oxidation, Activated Carbon Absorption, Fume Scrubbers)",
          },
        ],
      },
      {
        name: "Chemicals & Additives",
        children: [
          {
            name: "Acid Salts & Phosphate Coating Chemicals",
          },
          {
            name: "Additives (for Descaling, Foam & Mist Control, Rust Prevention, etc.)",
          },
          {
            name: "Chemicals (for Heavy Metal Removal, Chromium Reduction, etc.)",
          },
        ],
      },
      {
        name: "Consultants, Pollution Control",
      },
      {
        name: "Pollution Control Equipment, General",
      },
      {
        name: "Pollution Control Testing Laboratories",
      },
      {
        name: "Sustainability & Carbon Neutrality Products",
        children: [
          {
            name: "Renewable Energy Solutions for Manufacturing",
            children: [
              {
                name: "Solar Panel Installations",
              },
              {
                name: "Wind Turbine Systems for Factories",
              },
            ],
          },
          {
            name: "Carbon Footprint Tracking Software",
            children: [
              {
                name: "Carbon Accounting Software",
              },
              {
                name: "Lifecycle Assessment Tools",
              },
            ],
          },
          {
            name: "Sustainable Materials & Packaging (Biodegradable, Recycled)",
          },
        ],
      },
      {
        name: "Used Pollution Control Equipment",
      },
      {
        name: "Waste Management & Recycling",
        children: [
          {
            name: "Chemical Destruction",
          },
          {
            name: "Incineration",
          },
          {
            name: "Oil Recovery & Recycling",
          },
          {
            name: "Sludge & Chip Management",
          },
          {
            name: "Waste Management & Recycling",
          },
        ],
      },
      {
        name: "Water Treatment & Filtration",
        children: [
          {
            name: "Equipment (Ion Exchange, Sludge Conversion, RO, Distillation)",
          },
          {
            name: "Filtration Equipment (Presses, Media, Bags, Catridges, Rolls, Membrane)",
          },
          {
            name: "Solvent Recovery Equipment",
          },
          {
            name: "Water Filtration & Treatment Systems, Testing  & Engineering",
          },
        ],
      },
    ],
  },
  {
    name: "Supplies",
    children: [
      {
        name: "Adhesives, Films & Protective Materials",
        children: [
          {
            name: "Carrier Films",
          },
          {
            name: "Film & Sheet",
          },
          {
            name: "Films, Protective",
          },
          {
            name: "Masking (Films, Resins, Caps, etc)",
            children: [
              {
                name: "Masking Caps, Discs, Plugs",
              },
              {
                name: "Masking Devices, Spray Painting",
              },
              {
                name: "Masking Films",
              },
              {
                name: "Masking Resins, UV Curable",
              },
              {
                name: "Masking Tape for Plating & Painting",
              },
              {
                name: "Masking, Customized",
              },
            ],
          },
          {
            name: "Release Papers, Coated",
          },
          {
            name: "Sealing Tapes & Materials",
          },
          {
            name: "Shrink Film",
          },
          {
            name: "Shrink Tapes",
          },
          {
            name: "Tissues",
          },
        ],
      },
      {
        name: "Composites & Plastics Processing Supplies",
        children: [
          {
            name: "Adhesives for Plastics",
          },
          {
            name: "Brushes",
          },
          {
            name: "Caul Plates",
          },
          {
            name: "Choppers (for Fiberglass)",
          },
          {
            name: "Expansion Pads",
          },
          {
            name: "Filler Paste",
          },
          {
            name: "Hand Layup Tools (Cutters, Rollers, Scissors, Etc.)",
          },
        ],
      },
      {
        name: "Safety & Facility Maintenance",
        children: [
          {
            name: "Eye Protection",
          },
          {
            name: "Flooring, Chemical-Resistant",
          },
          {
            name: "Gloves",
          },
          {
            name: "Guards & Safety Equipment for Machinery",
          },
          {
            name: "Noise Abatement",
          },
          {
            name: "Plant Maintenance & Repair Equipment",
          },
          {
            name: "Protective Clothing",
          },
          {
            name: "Respirators, Hoods, Masks, Breathing Systems",
          },
          {
            name: "Safety Related Products",
          },
        ],
      },
      {
        name: "Shop & Office Equipment",
        children: [
          {
            name: "Air Compressors",
          },
          {
            name: "Digitizing/Scanning Equipment",
          },
          {
            name: "Furnishings, Shop & Office (Files, Desks, Benches, Cabinets, Tool Chests, Drawing Boards, etc.)",
          },
          {
            name: "Hydraulic Components & Systems",
          },
          {
            name: "Lighting Equipment",
          },
          {
            name: "Nameplates, Labels & Signs",
          },
          {
            name: "Pipe & Fittings, Chemical Resistant",
          },
          {
            name: "Pneumatic Components (including Compressors)",
          },
          {
            name: "Printers/Plotters/Drafting Machines",
          },
          {
            name: "Storage Equipment/Services",
          },
        ],
      },
      {
        name: "Structural Components & Replacement Parts",
        children: [
          {
            name: "Bearings, Thrust",
          },
          {
            name: "Cylinders (Plasticating) & Liners",
          },
          {
            name: "Fasteners",
          },
          {
            name: "Inserts",
          },
          {
            name: "Mounts for Machines",
          },
          {
            name: "Roll Coverings",
          },
          {
            name: "Screw Conversion Kits",
          },
          {
            name: "Screw Tips",
          },
          {
            name: "Screws (Plasticating)",
          },
          {
            name: "Valves",
          },
        ],
      },
      {
        name: "Surface Prep & Finishing Supplies",
        children: [
          {
            name: "Abrasive Papers",
          },
          {
            name: "Peel Plies",
          },
          {
            name: "Sanding Discs/Pads",
          },
          {
            name: "Surfacing Veils",
          },
        ],
      },
      {
        name: "Vaccuum Bagging & Airflow Components",
        children: [
          {
            name: "Bleeder Cloths",
          },
          {
            name: "Breather Cloths",
          },
          {
            name: "Gasket Materials For Vacuum Bags",
          },
          {
            name: "Hoses (Air, Liquid, Vacuum)",
          },
          {
            name: "Quick Disconnects For Vacuum Hoses",
          },
          {
            name: "Vacuum bagging materials, for >600 F",
          },
          {
            name: "Vacuum bagging materials, nylon",
          },
          {
            name: "Vacuum bagging materials, other",
          },
          {
            name: "Vacuum bagging materials, polymide",
          },
          {
            name: "Vacuum bagging materials, reusable",
          },
          {
            name: "Vacuum bagging materials, silicone",
          },
          {
            name: "Vacuum Valves & Pumps",
          },
        ],
      },
    ],
  },
  {
    name: "Surface Finishing",
    children: [
      {
        name: "Electrocoating",
        children: [
          {
            name: "Coils, Liquid Heating & Cooling",
          },
          {
            name: "Electrical Connectors, Chemical & Corrosion Resistant",
          },
          {
            name: "Electrocoatings",
          },
          {
            name: "Heaters, Immersion",
          },
          {
            name: "Mixers, Stirrers",
          },
          {
            name: "Paint-Circulating Systems",
          },
          {
            name: "Periodic-Reverse Equipment, Current Interrupters",
          },
          {
            name: "Programmable Controllers",
          },
          {
            name: "Rectifier Rebuilding & Repair",
          },
          {
            name: "Rectifiers",
          },
          {
            name: "Resins, Paint & Powder Coating",
          },
          {
            name: "Used Electrocoating Equipment",
          },
        ],
      },
      {
        name: "Finishing Systems, Paint, Porcelain Enamel, Powder, Conveyorized",
      },
      {
        name: "Inks for Metal Decorating & Color Coding",
      },
      {
        name: "Masking (Stop-off Coatings, Waxes, Caps, Plugs, Solder Dip)",
      },
      {
        name: "Mechanical Finishing",
        children: [
          {
            name: "Abrasive Belts, Discs, Backstand Idlers",
          },
          {
            name: "Abrasive Blasting Equipment, Dry",
          },
          {
            name: "Abrasive Blasting Equipment, Glass Bead",
          },
          {
            name: "Abrasive Blasting Equipment, Wet, Vapor",
          },
          {
            name: "Abrasive Blasting Materials",
          },
          {
            name: "Abrasive Compounds & Slurries",
          },
          {
            name: "Abrasive Flow Finishing Machines",
          },
          {
            name: "Abrasive Grain",
          },
          {
            name: "Abrasives, Non-Woven",
          },
          {
            name: "Barrel Lining Service",
          },
          {
            name: "Brushes, Cleaning & Polishing",
          },
          {
            name: "Buffing Compounds & Applicators",
          },
          {
            name: "Buffs",
          },
          {
            name: "Burnishing  Compounds",
          },
          {
            name: "Burnishing Balls & Shapes",
          },
          {
            name: "Centrifugal Barrel or Disk Finishing Equipment",
          },
          {
            name: "Chemical-Polishing Processes",
          },
          {
            name: "Contact Wheels, Abrasive Belt",
          },
          {
            name: "Courses in Vibratory Finishing",
          },
          {
            name: "Deburring Equipment",
          },
          {
            name: "Dryers, Vibratory",
          },
          {
            name: "Electropolishing Equipment",
          },
          {
            name: "Electropolishing Solutions",
          },
          {
            name: "Felt Wheels & Bobs",
          },
          {
            name: "Flapwheels",
          },
          {
            name: "Lapping Machines & Supplies",
          },
          {
            name: "Lathes, Buffing & Polishing",
          },
          {
            name: "Lubricants, Dry-Film or Solid-Film",
          },
          {
            name: "Mass Finishing Equipment Engineering & Installation Services",
          },
          {
            name: "Mass Finishing Media & Compounds",
          },
          {
            name: "Mass-Finishing Supplies",
          },
          {
            name: "Polishing Equipment & Supplies",
          },
          {
            name: "Robots, Deburring, Buffing, Polishing",
          },
          {
            name: "Shot-Peening Equipment & Supplies",
          },
          {
            name: "Spindle Finishing Equipment",
          },
          {
            name: "Tank Lining Services for Mass-Finishing Equipment",
          },
          {
            name: "Used Mechanical Finishing Equipment",
          },
          {
            name: "Vibratory Finishing Equipment",
          },
        ],
      },
      {
        name: "Metal Finishing Machines",
        children: [
          {
            name: "Honing Machines (Vertical, Horizontal)",
          },
          {
            name: "Roll Finishing Machines",
          },
          {
            name: "Super (Micro) Finishing Machines",
          },
        ],
      },
      {
        name: "Ovens & Curing",
        children: [
          {
            name: "Convection",
          },
          {
            name: "High-Velocity",
          },
          {
            name: "Infrared",
          },
          {
            name: "Oven-Temperature Monitors/Curing Analyzers",
          },
          {
            name: "Ultraviolet (UV) & Electron Beam (EB) Curing",
          },
        ],
      },
      {
        name: "Painting",
        children: [
          {
            name: "Coatings",
            children: [
              {
                name: "Ceramic, Refractory",
              },
              {
                name: "Chemical Coatings",
              },
              {
                name: "Conformal",
              },
              {
                name: "Electrocoatings",
              },
              {
                name: "Flame Spray-Coating Materials",
              },
              {
                name: "Lacquer",
              },
              {
                name: "Metallizing & Conductive",
              },
              {
                name: "Paint Thinners",
              },
              {
                name: "Paint, Touch-up",
              },
              {
                name: "Pigments",
              },
              {
                name: "Plastisol Coating Materials",
              },
              {
                name: "Protective Films",
              },
              {
                name: "Resins, Paint & Powder Coating",
              },
              {
                name: "Spray-Mask-Painting Barrier Coatings",
              },
              {
                name: "Stop-Off Coatings, Waxes",
              },
            ],
          },
          {
            name: "Painting Equipment",
            children: [
              {
                name: "Dispensing Equipment",
              },
              {
                name: "Electrocoating (plus Eductors & Membranes)",
              },
              {
                name: "Electrostatic, Spray & High-Speed Rotational",
              },
              {
                name: "Filtration & Strainers",
              },
              {
                name: "General Painting Equipment (Air-Assisted, Air Atomize, Airless, Curtain, Dip, Flow, Roller, etc)",
              },
              {
                name: "Overspray Recycling/Recovery Systems/Services",
              },
              {
                name: "Paint Mixing, Stirring, Circulation & Drum Rotation",
              },
              {
                name: "Painting Equipment Engineering & Installation",
              },
              {
                name: "Painting Equipment, General",
              },
              {
                name: "Spray Guns, Movers & Controls",
              },
              {
                name: "Spray Painting Nozzles",
              },
              {
                name: "Spray-Gun Controls, Memory",
              },
              {
                name: "Spray-Gun Movers, Paint or Powder Coating",
              },
              {
                name: "Spray-Gun Washers",
              },
              {
                name: "Used Painting Equipment",
              },
              {
                name: "Viscosity Control Systems",
              },
            ],
          },
          {
            name: "Power Supplies for Electrostatic Processes",
          },
          {
            name: "Robots, Painting & Powder Coating",
          },
          {
            name: "Ventilation & Air Make-Up Systems",
          },
        ],
      },
      {
        name: "Parts Dryers",
        children: [
          {
            name: "Centrifugal",
          },
          {
            name: "Compressed Air",
          },
          {
            name: "Rotary, Spiral",
          },
          {
            name: "Solvent",
          },
        ],
      },
      {
        name: "Plastics Finishing, Printing, Coating",
        children: [
          {
            name: "Abrasion Resistant Coating",
          },
          {
            name: "Adhesion Promoters for Inks & Coatings",
          },
          {
            name: "Conductive Coating",
          },
          {
            name: "Decorative Coating",
          },
          {
            name: "Embossing & Engraving Equipment for Plastics",
          },
          {
            name: "Flame-Resistant Coating",
          },
          {
            name: "Hot-stamp Tooling, Foils, Presses, & Other Heat Transfer Equipment",
          },
          {
            name: "In-Mold Coating & Equipment",
          },
          {
            name: "Labels & Labeling & Decorating Equipment (In-Mold, Out-of-Mold)",
          },
          {
            name: "Printing Systems for Plastics",
          },
          {
            name: "UV-Resistant Coating",
          },
        ],
      },
      {
        name: "Plating & Anodizing",
        children: [
          {
            name: "Acids & Acid Salts",
          },
          {
            name: "Anodes & Accessories",
            children: [
              {
                name: "Anode Bags",
              },
              {
                name: "Anode Bars, Baskets, Hooks",
              },
              {
                name: "Brass & Bronze",
              },
              {
                name: "Cadmium",
              },
              {
                name: "Carbon",
              },
              {
                name: "Cobalt, Nickel/Cobalt",
              },
              {
                name: "Copper",
              },
              {
                name: "Indium",
              },
              {
                name: "Insoluble: Ceramic & Metal Oxide",
              },
              {
                name: "Lead",
              },
              {
                name: "Magnesium",
              },
              {
                name: "Nickel",
              },
              {
                name: "Platinum and/or Palladium-Clad",
              },
              {
                name: "Silver",
              },
              {
                name: "Steel & Iron",
              },
              {
                name: "Tin",
              },
              {
                name: "Tin-Lead",
              },
              {
                name: "Tin-Zinc",
              },
              {
                name: "Titanium",
              },
              {
                name: "Zinc",
              },
            ],
          },
          {
            name: "Anodizing Dyes & Electrolytic Coloring Processes",
          },
          {
            name: "Anodizing Processes & Equipment, Aluminum Hardcoat",
          },
          {
            name: "Anodizing Processes, Aluminum",
          },
          {
            name: "Anodizing Sealants",
          },
          {
            name: "Chemicals, Management & Transport",
            children: [
              {
                name: "Activated Carbon",
              },
              {
                name: "Carboy Pumps",
              },
              {
                name: "Chelating Agents",
              },
              {
                name: "Chemical Transporting Equipment",
              },
              {
                name: "Chrome-Free Final Rinses (for Paint Pretreatment)",
              },
              {
                name: "Flocculants, Polyelectrolytes",
              },
              {
                name: "Inhibitors, Acid Pickling",
              },
              {
                name: "Plating Activators, All Metals",
              },
              {
                name: "Pumps for Chemical Service",
              },
              {
                name: "Pumps, Chemical Additive",
              },
            ],
          },
          {
            name: "Environmental & Process Control & Testing",
            children: [
              {
                name: "Anti-Mist Chemical Additives",
              },
              {
                name: "Balls, Floating Plastic (for Solution Heat Retention and/or Fume Suppression)",
              },
              {
                name: "Breathing Air Filters",
              },
              {
                name: "Current Controls",
              },
              {
                name: "Ekectrolytic Recovery",
              },
              {
                name: "Environmental Test Chambers",
              },
              {
                name: "Etchant-Recovery & Recycling Equipment",
              },
              {
                name: "Filter Aids",
              },
              {
                name: "Foam-Control Chemical Additives",
              },
              {
                name: "Metal Refiners & Reclaimers",
              },
              {
                name: "Plating Laboratory Supplies",
              },
              {
                name: "Plating Solution Testing Equipment (Chemical, Electrical)",
              },
              {
                name: "Plating Testing Equipment (Physical, Structural)",
              },
              {
                name: "Resins, Ion Exchange",
              },
              {
                name: "Spectrophotometers",
              },
            ],
          },
          {
            name: "Plating & Anodizing Equipment",
            children: [
              {
                name: "Barrel Finishing Equipment",
              },
              {
                name: "Barrel Plating Equipment & Repair",
              },
              {
                name: "Barrel Plating Media",
              },
              {
                name: "Baskets, Dipping, Pickling, Handling",
              },
              {
                name: "Blowers, Air (for Solution Agitation)",
              },
              {
                name: "Boilers",
              },
              {
                name: "Brightener Feeders, Automatic",
              },
              {
                name: "Cathode Rod Agitators",
              },
              {
                name: "Coils, Liquid Heating & Cooling",
              },
              {
                name: "Cooling Equipment for Plating & Anodizing Solutions",
              },
              {
                name: "Danglers & Cathode Contacts, Barrel Plating",
              },
              {
                name: "Electrical Connectors, Chemical & Corrosion Resistant",
              },
              {
                name: "Electroforming Equipment",
              },
              {
                name: "Heaters (Immersion, Liquid, Steam/Hot Water)",
              },
              {
                name: "Mechanical Plating Equipment",
              },
              {
                name: "Periodic-Reverse Equipment, Current Interruptors",
              },
              {
                name: "Plating & Anodizing Equipment, General",
              },
              {
                name: "Plating Equipment Engineering & Installation Services",
              },
              {
                name: "Plating Equipment, Continuous & Wire Strip",
              },
              {
                name: "Plating Timers",
              },
              {
                name: "Pulse Plating Power Supplies",
              },
              {
                name: "Rectifier Rebuilding & Repair",
              },
              {
                name: "Rectifiers",
              },
              {
                name: "Selective Plating Machines",
              },
              {
                name: "Temperature Indicators",
              },
              {
                name: "Used Plating Equipment",
              },
              {
                name: "Vacuum-Deposition Equipment, Supplies",
              },
            ],
          },
          {
            name: "Plating Processes",
            children: [
              {
                name: "Alloy: Chromium Substitute",
              },
              {
                name: "Aluminum Etchants & Deoxidizers",
              },
              {
                name: "Antiquing Solutions",
              },
              {
                name: "Blackening Processes, Solutions",
              },
              {
                name: "Brass or Bronze",
              },
              {
                name: "Bright Dips",
              },
              {
                name: "Brush Plating Equipment, Solutions & Supplies",
              },
              {
                name: "Cadmium",
              },
              {
                name: "Chromate Conversion Coatings",
              },
              {
                name: "Chromium",
              },
              {
                name: "Chromium, Colored",
              },
              {
                name: "Chromium, Trivalent",
              },
              {
                name: "Cobalt, Cobalt Alloy",
              },
              {
                name: "Copper",
              },
              {
                name: "Copper, Electroless",
              },
              {
                name: "Fluoborate",
              },
              {
                name: "for Aluminum",
              },
              {
                name: "for Magnesium",
              },
              {
                name: "for Plastics",
              },
              {
                name: "for Printed Circuits",
              },
              {
                name: "Galvanizing Equipment, Supplies",
              },
              {
                name: "Gold",
              },
              {
                name: "Gold, Electroless",
              },
              {
                name: "Hardcoatings, Clear, Scratch Resistan",
              },
              {
                name: "Indium",
              },
              {
                name: "Iron",
              },
              {
                name: "Lead",
              },
              {
                name: "Nickel",
              },
              {
                name: "Nickel Activators",
              },
              {
                name: "Nickel Sulfamate",
              },
              {
                name: "Nickel-Iron",
              },
              {
                name: "Nickel, Colored",
              },
              {
                name: "Nickel, Electroless",
              },
              {
                name: "Nickel, Satin Finish",
              },
              {
                name: "Oxide Finishes, Colored",
              },
              {
                name: "Palladium",
              },
              {
                name: "Palladium, Electroless",
              },
              {
                name: "Particle Co-Deposition",
              },
              {
                name: "Passivation",
              },
              {
                name: "Plating Processes, General",
              },
              {
                name: "Platinum",
              },
              {
                name: "Printed Circuit Board Processing Equipment & Chemicals",
              },
              {
                name: "Rhenium, Ruthenium",
              },
              {
                name: "Rhodium",
              },
              {
                name: "Rhodium, Electroless",
              },
              {
                name: "Silver",
              },
              {
                name: "Silver, Electroless",
              },
              {
                name: "Tin",
              },
              {
                name: "Tin-Lead",
              },
              {
                name: "Tin-Nickel",
              },
              {
                name: "Tin-Zinc",
              },
              {
                name: "Tin, Electroless",
              },
              {
                name: "Zinc",
              },
              {
                name: "Zinc-Cobalt",
              },
              {
                name: "Zinc-Iron",
              },
              {
                name: "Zinc-Nickel",
              },
            ],
          },
          {
            name: "Training in Plating",
          },
        ],
      },
      {
        name: "Powder Coating",
        children: [
          {
            name: "Powder Coating Equipment",
            children: [
              {
                name: "Electrostatic Spray",
              },
              {
                name: "Engineering & Installation",
              },
              {
                name: "Fluidized Bed",
              },
              {
                name: "Fluidized Bed, Electrostatic",
              },
              {
                name: "Paint Pumps",
              },
              {
                name: "Powder Coating Equipment Engineering & Installation",
              },
              {
                name: "Power Supplies for Electrostatic Processes",
              },
              {
                name: "Recovery Systems",
              },
              {
                name: "Sieves, Screening Devices, Sifters",
              },
              {
                name: "Used Powder Coating Equipment",
              },
            ],
          },
          {
            name: "Powder Coatings",
            children: [
              {
                name: "Electrocotings",
              },
              {
                name: "Fluorocarbon",
              },
              {
                name: "High Solids",
              },
              {
                name: "In Mold",
              },
              {
                name: "Military & Government Specification",
              },
              {
                name: "Plural-Component",
              },
              {
                name: "Radiation-Curable",
              },
              {
                name: "Strippable Plastic",
              },
              {
                name: "Waterborne",
              },
              {
                name: "Zinc-Rich",
              },
            ],
          },
          {
            name: "Powder Coatings",
            children: [
              {
                name: "Thermoplastic",
              },
              {
                name: "Thermoset",
              },
            ],
          },
        ],
      },
      {
        name: "Spray Booths & Equipment",
        children: [
          {
            name: "Spray Booth Cleaning Materials",
          },
          {
            name: "Spray Booth Coatings",
          },
          {
            name: "Spray Booth Compounds, Water Wash",
          },
          {
            name: "Spray Booth Filters",
          },
          {
            name: "Spray Booth Lighting Fixtures",
          },
          {
            name: "Spray Booth Sludge Removal Systems",
          },
          {
            name: "Spray Booths",
          },
        ],
      },
      {
        name: "Vacuum Metalizing Equipment & Materials",
      },
    ],
  },
  {
    name: "Temperature/Pressure Control Equipment",
    children: [
      {
        name: "Burners",
      },
      {
        name: "Chillers",
      },
      {
        name: "Coils, Liquid Heating & Cooling",
      },
      {
        name: "Cooling Towers",
      },
      {
        name: "Freezers/Coolers",
      },
      {
        name: "Furnaces",
      },
      {
        name: "Heat Exchangers",
      },
      {
        name: "Heat Pipes & Related Thermal Conductors",
      },
      {
        name: "Heat Tapes",
      },
      {
        name: "Heat-Recovery Equipment & Systems",
      },
      {
        name: "Heat-Transfer Fluids",
      },
      {
        name: "Heaters for Composites Applications",
      },
      {
        name: "Heaters, Heating Elements",
      },
      {
        name: "Hot-Water or Oil-circulating Temperature Controllers",
      },
      {
        name: "Immersion Heaters",
      },
      {
        name: "Infrared Heaters",
      },
      {
        name: "Ovens & Curing",
        children: [
          {
            name: "Catalyst Vapor Curing",
          },
          {
            name: "Convection",
          },
          {
            name: "Curing Ovens/Lamp Arrays",
          },
          {
            name: "High-Velocity",
          },
          {
            name: "Infrared",
          },
          {
            name: "Oven-Temperature Monitors/Curing Analyzers",
          },
          {
            name: "Ovens, General",
          },
          {
            name: "Ultraviolet (UV) & Electron Beam (EB) Curing",
          },
        ],
      },
      {
        name: "Pressure Controls, Sensors, Monitors",
      },
      {
        name: "Temperature Control Devices",
      },
      {
        name: "Thermal Sensors",
      },
      {
        name: "Water Treatment/Filtration Systems",
      },
      {
        name: "Water, Oil Manifolds & Couplings",
      },
    ],
  },
  {
    name: "Workholding",
    children: [
      {
        name: "Actuators, Hydraulic & Pneumatic",
      },
      {
        name: "Angle & Sub Plates",
      },
      {
        name: "Arbors, Expandable Workholding",
      },
      {
        name: "Centers, Live & Other",
      },
      {
        name: "Chucks",
        children: [
          {
            name: "Chuck Jaws & Collets",
          },
          {
            name: "Collet Type (for Workholding)",
          },
          {
            name: "Diaphragm Chucks",
          },
          {
            name: "Gear Chucks",
          },
          {
            name: "Index Chucks",
          },
          {
            name: "Jaw Type",
          },
          {
            name: "Magnetic Chucks",
          },
          {
            name: "Power Chucks",
          },
          {
            name: "Precision Chucks",
          },
          {
            name: "Self-Contained Chucks",
          },
          {
            name: "Special Chucks",
          },
          {
            name: "Vacuum Chucks",
          },
        ],
      },
      {
        name: "Clamps & Fixturing Devices",
      },
      {
        name: "Collets for Workholding",
      },
      {
        name: "Custom Workholding",
      },
      {
        name: "Dividing & Indexing Heads",
      },
      {
        name: "Fixturing Systems",
      },
      {
        name: "Guide Bushings (for Swiss Lathes)",
      },
      {
        name: "Indexers & Rotary Tables",
      },
      {
        name: "Mandrels",
      },
      {
        name: "Pedestal Type Fixtures & Tombstone Blocks",
      },
      {
        name: "Steady Rests",
      },
      {
        name: "Vises & Vise Jaws",
      },
      {
        name: "Workholding Equipment, General",
      },
    ],
  },
];

/* ======================================
   🚀 RUN
====================================== */
async function main() {
  console.log("Seeding industries (existing rows are kept)...");
  const { createdCount, skippedCount } = await createIndustryTree(industries);
  const total = await prisma.industry.count();
  console.log(`Created: ${createdCount}`);
  console.log(`Already existed: ${skippedCount}`);
  console.log(`Total industries in database: ${total}`);
  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());