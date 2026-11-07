/**
 * Sales tax presets by province/territory, as percentages.
 * HST provinces put the whole HST in `gst` and 0 in `pst`.
 * Rates can be edited in Settings if they change.
 */
export interface TaxPreset {
  code: string;
  name: string;
  gstLabel: string;
  pstLabel: string;
  gst: number;
  pst: number;
}

export const TAX_PRESETS: TaxPreset[] = [
  { code: 'QC', name: 'Quebec', gstLabel: 'GST', pstLabel: 'QST', gst: 5, pst: 9.975 },
  { code: 'ON', name: 'Ontario', gstLabel: 'HST', pstLabel: 'PST', gst: 13, pst: 0 },
  { code: 'BC', name: 'British Columbia', gstLabel: 'GST', pstLabel: 'PST', gst: 5, pst: 7 },
  { code: 'AB', name: 'Alberta', gstLabel: 'GST', pstLabel: 'PST', gst: 5, pst: 0 },
  { code: 'SK', name: 'Saskatchewan', gstLabel: 'GST', pstLabel: 'PST', gst: 5, pst: 6 },
  { code: 'MB', name: 'Manitoba', gstLabel: 'GST', pstLabel: 'RST', gst: 5, pst: 7 },
  { code: 'NB', name: 'New Brunswick', gstLabel: 'HST', pstLabel: 'PST', gst: 15, pst: 0 },
  { code: 'NS', name: 'Nova Scotia', gstLabel: 'HST', pstLabel: 'PST', gst: 14, pst: 0 },
  { code: 'PE', name: 'Prince Edward Island', gstLabel: 'HST', pstLabel: 'PST', gst: 15, pst: 0 },
  { code: 'NL', name: 'Newfoundland and Labrador', gstLabel: 'HST', pstLabel: 'PST', gst: 15, pst: 0 },
  { code: 'YT', name: 'Yukon', gstLabel: 'GST', pstLabel: 'PST', gst: 5, pst: 0 },
  { code: 'NT', name: 'Northwest Territories', gstLabel: 'GST', pstLabel: 'PST', gst: 5, pst: 0 },
  { code: 'NU', name: 'Nunavut', gstLabel: 'GST', pstLabel: 'PST', gst: 5, pst: 0 },
];

export function presetFor(code: string): TaxPreset {
  return TAX_PRESETS.find((p) => p.code === code) ?? TAX_PRESETS[0];
}
