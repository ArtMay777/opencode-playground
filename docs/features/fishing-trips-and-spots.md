# Fishing Trips and Spots

> **Status:** planned — do not implement as part of the MVP.

## Overview

This feature will let an angler create a fishing trip and group multiple catch records under it. A fishing trip will describe where and when the angler went fishing, while catch records will describe the individual results of that trip.

## User stories

1. As an amateur angler, I want to create a fishing trip with a fishing spot, date, and optional note so that I can organize my catches by outing.
2. As an amateur angler, I want to assign catch records to a fishing trip so that I can review the results of one outing together.
3. As an amateur angler, I want to view the total fish count and total weight for a fishing trip so that I can compare the results of different outings.

## Rough acceptance criteria

- An angler can create, view, edit, and delete fishing trips.
- A catch record can be assigned to one fishing trip or left unassigned.
- A fishing trip shows its attached catch records, total fish count, and total weight.

## Expected impact

- **Data:** add a Fishing Trip entity and a relationship from a catch record to an optional fishing trip.
- **API:** add endpoints for fishing trips and update catch record requests to support a trip assignment.
- **UI:** add a fishing trip list, a trip form, trip details, and a trip selector in the catch record form.
