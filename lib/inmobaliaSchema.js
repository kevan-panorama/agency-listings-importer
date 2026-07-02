export const inmobaliaDefault = {
  main: {
    reference: "",
    type: "",
    development: "",
    location: "",
    forSale: false,
    underOffer: false,
    sold: false,
    salePrice: "",
    showSalePrice: true,
    previousPrice: "",
    forRentLongTerm: false,
    forRentShortTerm: false,
    rented: false,
    longTermPrice: "",
    showLongTermPrice: true,
    shortTermPrice: "",
    showShortTermPrice: true,
    shortTermPeriod: "",
    bedrooms: "",
    bathrooms: "",
    toilets: "",
    suiteBaths: "",
    pax: "",
    levels: "",
    built: "",
    plot: "",
    terrace: "",
    interior: "",
    floor: "",
    constructionYear: "",
    constructionMonth: "",
    renovationYear: "",
    renovationMonth: "",
    pool: "",
    garden: "",
    garage: "",
    parkingSpaces: "",
    orientation: "",
    communityFees: "",
    ibi: "",
    garbageTax: "",
    tags: [],
    newDevelopment: false,
    exclusive: false,
    featured: false,
    special: false,
    hotProperty: false,
    luxury: false,
    externalPortals: false,
    direct: false,
    plotWithLicence: false,
  },

  descriptions: {
    language: "English",
    shortDescription: "",
    description: "",
    priceDescription: "",
    extraDescription: "",
    views: {
      country: false,
      golf: false,
      marina: false,
      panoramic: false,
      pool: false,
      street: false,
      garden: false,
      lake: false,
      mountain: false,
      partialSea: false,
      sea: false,
      urban: false,
    },
    locationFeatures: [],
    climateControl: [],
    condition: [],
    features: [],
    furniture: [],
    rooms: [],
    security: [],
  },

  images: {
    imageUrls: [],
    downloadedImages: [],
    mainImage: "",
    imageCount: 0,
    sourceGalleryUrl: "",
    sourceWebsiteImages: [],
    sourceEmailImages: [],
  },

  private: {
    seller: "",
    listedBy: "",
    listedByAdditional: "",
    statusUpdateEmail: "",
    nextDeliveryOn: "",
    gpsCoordinates: "",
    cadastralReference: "",
    postcode: "",
    zone: "",
    address: "",
    valuation: "",
    valuationDate: "",
    finalSellingPrice: "",
    sellingDate: "",
    soldTo: "",
    visitingConditions: "",
    keysCode: "",
    keyStatus: "",
    saleBoards: false,
    keys: false,
    taxesPaymentInfo: "",
    expenses: "",
    internalNotes: "",
  },

  commission: {
    saleCommission: "",
    internalComments: "",
    networkCommissionTotal: "",
    networkCommissionSplit: "",
    ownCommissionTotal: "",
    ownCommissionSplit: "",
    publicComments: "",
  },

  attachments: {
    files: [],
    links: [],
    html: [],
    brochures: [],
    notaSimple: [],
    mandate: [],
    floorplans: [],
    energyCertificate: [],
    driveFolder: "",
    dropboxFolder: "",
    marketingMaterialFolder: "",
  },

  legal: {
    energyCertificationInProcess: false,
    certConsumption: "",
    consumption: "",
    certEmission: "",
    emission: "",
    energyPerformanceCertificate: "",
    touristicCode: "",
    rateableValue: "",
    ownersDniNie: "",
    legalRepresentative: "",
    copyRegistrationCompany: false,
    copyPowerAttorney: false,
    propertyRegistry: "",
    copyPropertyRegistration: false,
    copyNotaSimple: false,
    copyIbiBills: false,
    copyTrashBills: false,
    copyPlans: false,
    agencyAgreement: false,
    communityAdministratorDetails: "",
    copyFirstOccupationLicense: false,
    tenSecurityCopy: false,
  },

  mlsPortals: {
    inmobaliaSharedSales: false,
    inmobaliaSharedRent: false,
    privateNetworks: {
      lpaMls: false,
    },
    portalsFeeds: {
      allPortalsFeeds: false,
      propertytop: false,
      csNolab700k: false,
      csRealtyWare500k: false,
      ltrIdealistaApi: false,
      strJamesEdition500k: false,
      idealistaApi: false,
      theNls: false,
      andalucia: false,
      csPrestige500k: false,
      lpa: false,
      ltrKyero: false,
      strMerEtDemeures: false,
      kyero: false,
      thinkSpain: false,
      csNestseekers1m: false,
      csPropertyguides500k: false,
      ltrStrThinkspain: false,
      strSpainhouses: false,
      greenAcres: false,
      resaleOnline500k: false,
      web: true,
    },
    cloneWebPermission: "all_agencies_no",
    agenciesCanCloneWebAndPortals: "",
    agenciesCanCloneWebOnly: "",
    portalRestrictions: "",
  },
};

function mergeDefaults(defaultValue, inputValue) {
  if (Array.isArray(defaultValue)) {
    return Array.isArray(inputValue) ? inputValue : defaultValue;
  }

  if (
    defaultValue &&
    typeof defaultValue === "object" &&
    !Array.isArray(defaultValue)
  ) {
    const output = {};

    for (const key of Object.keys(defaultValue)) {
      output[key] = mergeDefaults(
        defaultValue[key],
        inputValue ? inputValue[key] : undefined
      );
    }

    return output;
  }

  if (inputValue === undefined || inputValue === null) {
    return defaultValue;
  }

  return inputValue;
}

export function normalizeInmobalia(input = {}) {
  return {
    main: mergeDefaults(inmobaliaDefault.main, input.main),
    descriptions: mergeDefaults(
      inmobaliaDefault.descriptions,
      input.descriptions
    ),
    images: mergeDefaults(inmobaliaDefault.images, input.images),
    private: mergeDefaults(inmobaliaDefault.private, input.private),
    commission: mergeDefaults(inmobaliaDefault.commission, input.commission),
    attachments: mergeDefaults(inmobaliaDefault.attachments, input.attachments),
    legal: mergeDefaults(inmobaliaDefault.legal, input.legal),
    mlsPortals: mergeDefaults(inmobaliaDefault.mlsPortals, input.mlsPortals),
  };
}

export const inmobaliaRequiredFields = [
  "main.type",
  "main.location",
  "main.salePrice",
  "main.bedrooms",
  "main.bathrooms",
  "main.built",
  "descriptions.shortDescription",
  "descriptions.description",
  "images.imageUrls",
  "private.seller",
  "commission.saleCommission",
];

export function mapListingToInmobalia(listing = {}) {
  return normalizeInmobalia({
    main: {
      type: listing.propertyType || "",
      location:
        [listing.neighborhood, listing.city].filter(Boolean).join(", ") || "",
      forSale: listing.operation === "Sale",
      salePrice: listing.price || "",
      bedrooms: listing.bedrooms || "",
      bathrooms: listing.bathrooms || "",
      toilets: listing.guestToilets || "",
      built: listing.surfaceSqm || "",
      plot: listing.plotSqm || "",
      terrace: listing.terraceSqm || "",
      exclusive: /exclusive/i.test(listing.internalNotes || ""),
      direct: false,
    },
    descriptions: {
      shortDescription: listing.propertyTitle || "",
      description: listing.description || "",
    },
    images: {
      imageUrls: listing.photoLinks || [],
      imageCount: listing.photoLinks?.length || 0,
    },
    private: {
      seller: listing.agencyName || "",
      address: listing.address || "",
      zone: listing.neighborhood || "",
      internalNotes: listing.internalNotes || "",
    },
    commission: {
      saleCommission: listing.commission || "",
      internalComments: listing.internalNotes || "",
    },
    attachments: {
      links: listing.detectedLinks || [],
    },
  });
}
