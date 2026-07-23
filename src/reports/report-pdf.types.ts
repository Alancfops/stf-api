export type ReportTimeseriesPoint = {
  dateLabel: string;
  rawValue: number;
  rawLabel: string;
  classificationLabel: string;
  isCurrent?: boolean;
};

export type ReportPdfData = {
  therapistName: string;
  therapistCrefito?: string | null;
  issueLocation?: string | null;
  issuedAtDateLabel: string;
  issuedAtTimeLabel: string;
  patient: {
    fullName: string;
    age: number;
    genderLabel: string;
    schoolingLabel?: string | null;
  };
  assessment: {
    instrumentName: string;
    instrumentAuthors: string[];
    sessionDateLabel: string;
    sessionTimeLabel: string;
    rawLabel: string;
    resultDetailLabel: string;
    classificationLabel: string;
    referenceLabel: string;
    interpretation: string;
    notesObservation?: string | null;
  };
  evolution: {
    canShowChart: boolean;
    yAxisLabel: string;
    instrumentCode?: string;
    improvementHint?: string;
    points: ReportTimeseriesPoint[];
  };
  generatedAtLabel: string;
};
