# Attribution & Third-Party Notices

## TradingView Lightweight Charts™

OpenChart renders all charts using **TradingView Lightweight Charts™**, an
open-source charting library licensed under the Apache License 2.0.

As required by the library's license, OpenChart displays a persistent
"Powered by TradingView Lightweight Charts™" badge (in the status bar) linking
to https://www.tradingview.com/, and reproduces the NOTICE below.

> TradingView Lightweight Charts™
> Copyright (с) 2025 TradingView, Inc. https://www.tradingview.com/
>
> Licensed under the Apache License, Version 2.0 (the "License");
> you may not use this file except in compliance with the License.
> You may obtain a copy of the License at
>
>     http://www.apache.org/licenses/LICENSE-2.0
>
> Unless required by applicable law or agreed to in writing, software
> distributed under the License is distributed on an "AS IS" BASIS,
> WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
> See the License for the specific language governing permissions and
> limitations under the License.

Project: https://github.com/tradingview/lightweight-charts

## Market data providers

Market data is provided by third parties under their own terms of service.
OpenChart accesses them through free-tier API keys that you supply:

- **Twelve Data** — https://twelvedata.com/ (global coverage, delayed on free tier)
- **Finnhub** — https://finnhub.io/ (US real-time WebSocket, company news)
- **Alpha Vantage** — https://www.alphavantage.co/ (delayed fallback)
- **Alpaca** — https://alpaca.markets/ (paper trading + free IEX data)

Data is delayed on free tiers; "real-time" free US data is IEX-only (single
exchange), not full-market SIP. Review each provider's terms before redistributing data.

## Icons

Icons by **Lucide** (https://lucide.dev/), ISC License.
