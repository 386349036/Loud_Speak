// Evolution is 80% of the former grown size; anchors stay at the foot centre.
export const EVOLVED_SCALE=.8;
export function playerSize(form,crouch=false){return form?{w:9.6,h:crouch?11.2:22.4}:{w:12,h:14};}
