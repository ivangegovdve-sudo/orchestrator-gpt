# Calendar Generator Attribution

This mini-project incorporates and adapts material from:

- `CalendarGenerator` by Franco Mossotto
- Source: <https://github.com/fmossott/CalendarGenerator>
- Original license: Apache License 2.0

The original Apache license text is included in [APACHE-2.0.txt](./APACHE-2.0.txt).

Forest HUB modifications in this derivative work:

- moved the app into `web/calendar/` for direct integration inside Forest HUB
- removed the original Google Analytics snippet
- removed the jQuery dependency and rewrote the page logic in plain JavaScript
- switched persistence from cookies to `localStorage`
- added graceful fallback messaging when the holiday API is unavailable
- added Forest HUB navigation, route shims, and updated styling for the existing dashboard
- preserved the sample images and placeholder image from the upstream project
