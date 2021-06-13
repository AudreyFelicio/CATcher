import { Component, OnInit } from '@angular/core';
import { LoggingService } from '../core/services/logging.service';

@Component({
  selector: 'app-log-view',
  templateUrl: './log-view.component.html',
  styleUrls: ['./log-view.component.css']
})
export class LogViewComponent implements OnInit {

  constructor(public logger: LoggingService) { }

  ngOnInit(): void {}

}
