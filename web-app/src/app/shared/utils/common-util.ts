import { Tag } from '../../pojo/Tag';

export function formatTagName(tag: Tag): string {
  if (tag.value != undefined && tag.value.trim() != '') {
    return `${tag.name}:${tag.value}`;
  } else {
    return tag.name;
  }
}
