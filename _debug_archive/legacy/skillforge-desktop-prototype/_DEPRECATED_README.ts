/**
 * ================================================================================
 * LEGACY DESKTOP PROTOTYPE - DO NOT USE FOR PRODUCTION
 * ================================================================================
 *
 * This directory contains the initial desktop-centered prototype of Skillforge.
 * It has been deprecated in favor of the mobile-first adaptive layout.
 *
 * REASON FOR DEPRECATION:
 * - Was designed with desktop layout assumptions
 * - Did not follow mobile-first (9:16 portrait) design principles
 * - Contained responsive patterns instead of explicit adaptive layout
 *
 * WHAT CAN BE REFERENCED:
 * - Layer architecture concepts (World/Display/System)
 * - Naming conventions
 * - Type definitions structure
 * - ExitPresentationSystem architecture
 *
 * WHAT SHOULD NOT BE REUSED:
 * - Layout structure and DOM arrangement
 * - Screen ratio calculations
 * - CSS layout rules
 * - Position/coordinate logic
 *
 * The new implementation follows:
 * - Mobile (9:16 portrait) as the base device
 * - Tablet as "extended mobile" (not separate desktop UI)
 * - Adaptive layout with only mobile/tablet breakpoints
 * - Canvas with fixed logical resolution
 *
 * "태블릿은 다른 UI가 아니라, 더 여유 있는 모바일이다."
 *
 * ================================================================================
 */

export {};
