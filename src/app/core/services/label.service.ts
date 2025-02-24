import { Injectable } from '@angular/core';
import { GithubService } from './github.service';
import { map, flatMap } from 'rxjs/operators';
import { Label } from '../models/label.model';
import { Observable, pipe, UnaryFunction } from 'rxjs';

/* The threshold to decide if color is dark or light.
A higher threshold value will result in more colors determined to be "dark".
W3C recommendation is 0.179, but 0.184 is chosen so that some colors (like bright red)
are considered dark (Github too consider them dark) */
const COLOR_DARKNESS_THRESHOLD = 0.184;

const COLOR_DARK_TEXT  = '000000'; // Dark color for text with light background
const COLOR_LIGHT_TEXT  = 'FFFFFF'; // Light color for text with dark background

const DISPLAY_NAME_SEVERITY = 'Severity';
const DISPLAY_NAME_BUG_TYPE = 'Bug Type';
const DISPLAY_NAME_RESPONSE = 'Response';

// The HTML template definition of selected labels are hard-coded here, move to a config file in the future
const VERY_LOW_DEFINITION = '<p>A flaw that is <mark>purely cosmetic</mark> and <mark>does not affect usage</mark>. For example, '
  + '<ul>'
  + '<li>typo issues</li>'
  + '<li>spacing issues</li>'
  + '<li>layout issues</li>'
  + '<li>color issues</li>'
  + '<li>font issues</li>'
  + '</ul>'
  + 'in the docs or the UI that doesn\'t affect usage.</p>';
const LOW_DEFINITION = '<p>A flaw that is unlikely to affect normal operations of the product. '
  + 'Appears only in very rare situations and causes a minor inconvenience only.</p>';
const MEDIUM_DEFINITION = '<p>A flaw that causes occasional inconvenience to some users but they can '
  + 'continue to use the product.</p>';
const HIGH_DEFINITION = '<p>A flaw that affects most users and causes major problems for users.'
  + 'i.e., makes the product almost unusable for most users.</p>';

const FUNCTIONALITY_BUG_DEFINITION = '<p>A functionality does not work as specified/expected.</p>';
const FEATURE_FLAW_DEFINITION = '<p>Some functionality missing from a feature delivered in the current version in '
  + 'a way that the feature becomes less useful to the intended target user for <i>normal</i> usage. '
  + 'i.e., the feature is not \'complete\'.\nIn other words, an acceptance-testing bug that falls within '
  + 'the scope of the current version features. These issues are counted against the <i>product design</i> aspect '
  + 'of the project.</p>';
const DOCUMENTATION_BUG_DEFINITION = '<p>A flaw in the documentation '
  + '<span style="color:grey;">e.g., a missing step, a wrong instruction, typos</span></p>';

const ACCEPTED_DEFINITION = '<p>You accept it as a bug.</p>';
const NOT_IN_SCOPE_DEFINITION = '<p>It is a valid issue but not something the team should be penalized for '
  + '<span style="color:grey;">e.g., it was not related to features delivered in this version</span>.</p>';
const REJECTED_DEFINITION = '<p>What tester treated as a bug is in fact the expected behavior (from the user\'s point of view), or the tester '
  + 'was mistaken in some other way.</p>';
const CANNOT_REPRODUCE_DEFINITION = '<p>You are unable to reproduce the behavior reported in the bug after multiple tries.</p>';
const ISSUE_UNCLEAR_DEFINITION = '<p>The issue description is not clear.</p>';
const UNDEFINED_DEFINITION = null;

export const LABEL_DEFINITIONS = {
  severityVeryLow : VERY_LOW_DEFINITION,
  severityLow: LOW_DEFINITION,
  severityMedium: MEDIUM_DEFINITION,
  severityHigh: HIGH_DEFINITION,
  typeFunctionalityBug: FUNCTIONALITY_BUG_DEFINITION,
  typeFeatureFlaw: FEATURE_FLAW_DEFINITION,
  typeDocumentationBug: DOCUMENTATION_BUG_DEFINITION,
  responseAccepted: ACCEPTED_DEFINITION,
  responseNotInScope: NOT_IN_SCOPE_DEFINITION,
  responseRejected: REJECTED_DEFINITION,
  responseCannotProduce: CANNOT_REPRODUCE_DEFINITION,
  responseIssueUnclear: ISSUE_UNCLEAR_DEFINITION,
  undefined: UNDEFINED_DEFINITION
};

const REQUIRED_LABELS = {
  severity: {
    VeryLow: new Label('severity', 'VeryLow', 'ffe0e0', VERY_LOW_DEFINITION),
    Low: new Label('severity', 'Low', 'ffcccc', LOW_DEFINITION),
    Medium: new Label('severity', 'Medium', 'ff9999', MEDIUM_DEFINITION),
    High: new Label('severity', 'High', 'ff6666', HIGH_DEFINITION)
  },
  type: {
    DocumentationBug: new Label('type', 'DocumentationBug', 'd966ff', DOCUMENTATION_BUG_DEFINITION),
    FeatureFlaw: new Label('type', 'FeatureFlaw', 'd966ff', FEATURE_FLAW_DEFINITION),
    FunctionalityBug: new Label('type', 'FunctionalityBug', '9900cc', FUNCTIONALITY_BUG_DEFINITION)
  },
  response: {
    Accepted: new Label('response', 'Accepted', '00802b', ACCEPTED_DEFINITION),
    CannotReproduce: new Label('response', 'CannotReproduce', 'ffebcc', CANNOT_REPRODUCE_DEFINITION),
    IssueUnclear: new Label('response', 'IssueUnclear', 'ffcc80', ISSUE_UNCLEAR_DEFINITION),
    NotInScope: new Label('response', 'NotInScope', 'ffcc80', NOT_IN_SCOPE_DEFINITION),
    Rejected: new Label('response', 'Rejected', 'ff9900', REJECTED_DEFINITION)
  },
  status: {
    Done: new Label('status', 'Done', 'a6a6a6'),
    Incomplete: new Label('status', 'Incomplete', '000000')
  },
  others: {
    duplicate: new Label(undefined, 'duplicate', '0066ff')
  }
};

@Injectable({
  providedIn: 'root'
})

/**
 * Responsible for retrieval and parsing and syncing of label data
 * from the GitHub repository for the CATcher application.
 */
export class LabelService {

  private static severityLabels: Label[] = Object.values(REQUIRED_LABELS.severity);
  private static typeLabels: Label[] = Object.values(REQUIRED_LABELS.type);
  private static responseLabels: Label[] = Object.values(REQUIRED_LABELS.response);
  private static statusLabels: Label[] = Object.values(REQUIRED_LABELS.status);
  private static otherLabels: Label[] = Object.values(REQUIRED_LABELS.others);
  private static allLabelArrays = {
    severity: LabelService.severityLabels,
    type: LabelService.typeLabels,
    response: LabelService.responseLabels,
    status: LabelService.statusLabels,
    others: LabelService.otherLabels
  };
  private static testerLabelArrays = {
    severity: LabelService.severityLabels,
    type: LabelService.typeLabels,
  };

  constructor(private githubService: GithubService) {
  }

  public static getRequiredLabelsAsArray(needAllLabels: boolean): Label[] {
    let requiredLabels: Label[] = [];

    const labels = needAllLabels ? Object.values(this.allLabelArrays) : Object.values(this.testerLabelArrays);
    labels.map(label => requiredLabels = requiredLabels.concat(label));
    return requiredLabels;
  }

  /**
   * Returns an custom operator which helps to
   * synchronise the labels in our application
   * with the remote repository.
   */
  syncLabels(needAllLabels: boolean): UnaryFunction<Observable<boolean>, Observable<any>> {
    return pipe(
      flatMap(() => this.synchronizeRemoteLabels(needAllLabels))
    );
  }

  /**
   * Synchronizes the labels in github with those required by the application.
   */
  synchronizeRemoteLabels(needAllLabels: boolean): Observable<any> {
      return this.githubService.fetchAllLabels().pipe(
        map((response) => {
          this.ensureRepoHasRequiredLabels(this.parseLabelData(response), LabelService.getRequiredLabelsAsArray(needAllLabels));
          return response;
        })
      );
  }

  /**
   * Returns all the labels of a certain type (e.g severity)
   * @param attributeName: the type of the label
   * @return an array of label of that type
   */
  getLabelList(attributeName: string): Label[] {
    switch (attributeName) {
      case 'severity':
        return LabelService.severityLabels;
      case 'type':
        return LabelService.typeLabels;
      case 'responseTag':
      case 'response':
        return LabelService.responseLabels;
    }
  }

  /**
   * Returns a title for the label type
   * @param attributeName: the type of the label
   */
  getLabelTitle(attributeName: string): string {
    switch (attributeName) {
      case 'severity':
        return DISPLAY_NAME_SEVERITY;
      case 'type':
        return DISPLAY_NAME_BUG_TYPE;
      case 'responseTag':
        return DISPLAY_NAME_RESPONSE;
    }
  }

  /**
   * Returns the color of the label by searching a list of
   * all available labels.
   * @param labelValue: the label's value (e.g Low / Medium / High / ...)
   */
  getColorOfLabel(labelValue: string): string {
    // TODO: Rewrite function - labelValue insufficient to differentiate between labels. Should use `labelCategory.labelValue` format.
    const WHITE_COLOR = 'ffffff';
    if (labelValue === '') {
      return WHITE_COLOR;
    }

    const existingLabel = LabelService.getRequiredLabelsAsArray(true).find(label => label.labelValue === labelValue);

    if (existingLabel === undefined || existingLabel.labelColor === undefined) {
      return WHITE_COLOR;
    } else {
      return existingLabel.labelColor;
    }
  }

  /**
   * Returns the definition of the label by searching a list of
   * all available labels.
   * @param labelValue: the label's value (e.g Low/ Medium/ High / ...).
   * @param labelCategory: the label's category (e.g Type/ Severity / ...).
   */
  getLabelDefinition(labelValue: string, labelCategory: string): string {
    if (labelValue === '' || labelValue === null || labelCategory === '' || labelCategory === null) {
      return null;
    }

    const existingLabel = LabelService.getRequiredLabelsAsArray(true).find(
      label => label.labelValue === labelValue && label.labelCategory === labelCategory
    );

    if (existingLabel === undefined || existingLabel.labelDefinition === undefined) {
      return null;
    } else {
      return existingLabel.labelDefinition;
    }
  }

  /**
   * Ensures that the repo has the required labels.
   * Compares the actual labels in the repo with the required labels. If an required label is missing,
   * it is added to the repo. If the required label exists but the label color is not as expected,
   * the color is updated. Does not delete actual labels that do not match required labels.
   * i.e., the repo might have more labels than the required labels after this operation.
   * @param actualLabels: labels in the repo.
   * @param requiredLabels: required labels.
   */
  private ensureRepoHasRequiredLabels(actualLabels: Label[], requiredLabels: Label[]): void {

    requiredLabels.forEach(label => {

      // Finds for a label that has the same name as a required label.
      const nameMatchedLabels: Label[] = actualLabels.filter(remoteLabel =>
          remoteLabel.getFormattedName() === label.getFormattedName());

      if (nameMatchedLabels.length === 0) {

        // Create new Label (Could not find a label with the same name & category)
        this.githubService.createLabel(label.getFormattedName(), label.labelColor);

      } else if (nameMatchedLabels.length === 1) {
        if (nameMatchedLabels[0].equals(label)) {

          // the label exists exactly as expected -> do nothing

        } else {

          // the label exists but the color does not match
          this.githubService.updateLabel(label.getFormattedName(), label.labelColor);

        }
      } else {
        throw new Error('Unexpected error: the repo has multiple labels with the same name ' + label.getFormattedName());
      }

    });
  }

  /**
   * Parses label information and returns an array of Label objects.
   * @param labels - Label Information from API.
   */
  parseLabelData(labels: Array<{}>): Label[] {
    const labelData: Label[] = [];

    for (const label of labels) {

      let labelCategory: string;
      let labelValue: string;
      const containsDotRegex = /\./g;

      const rawName: string = String(label['name']);

      [labelCategory, labelValue] = containsDotRegex.test(rawName)
        ? String(label['name']).split('.')
        : [undefined, rawName];

      const labelColor: string = String(label['color']);

      const labelDefinition: string = String(label['definition']);

      labelData.push(new Label(labelCategory, labelValue, labelColor, labelDefinition));
    }
    return labelData;
  }

   /**
   * Returns true if the given color is considered "dark"
   * The color is considered "dark" if its luminance is less than COLOR_DARKNESS_THRESHOLD
   * @param inputColor: the color
   */
  isDarkColor(inputColor: string): boolean {
    const COLOR = (inputColor.charAt(0) === '#') ? inputColor.substring(1, 7) : inputColor;
    const R = parseInt(COLOR.substring(0, 2), 16);
    const G = parseInt(COLOR.substring(2, 4), 16);
    const B = parseInt(COLOR.substring(4, 6), 16);
    const RGB = [R / 255, G / 255, B / 255];
    const LINEAR_RGB = RGB.map((col) => {
      if (col <= 0.03928) {
        return col / 12.92;
      }
      return Math.pow((col + 0.055) / 1.055, 2.4);
    });
    // Calculate the luminance of the color
    const LUMINANCE = (0.2126 * LINEAR_RGB[0]) + (0.7152 * LINEAR_RGB[1]) + (0.0722 * LINEAR_RGB[2]);
    // The color is "dark" if the luminance is lower than the threshold
    return LUMINANCE < COLOR_DARKNESS_THRESHOLD;
  }

  /**
   * Returns a css style for the label to use
   * @param color: the color of the label
   * @return the style with background-color in rgb
   * @throws exception if input is an invalid color code
   */
  setLabelStyle(color: string, display: string = 'inline-flex') {
    let textColor: string;

    textColor = this.isDarkColor(color) ? COLOR_LIGHT_TEXT : COLOR_DARK_TEXT;

    const styles = {
      'background-color' : `#${color}`,
      'border-radius' : '3px',
      'cursor' : 'default',
      'padding' : '3px',
      'color' : `#${textColor}`,
      'font-weight' : '410',
      'display': display
    };

    return styles;
  }

}
