import { Injectable } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';

@Injectable()
export class HttpService {
  async fetch(config: AxiosRequestConfig<any>) {
    return axios(config);
  }
}
