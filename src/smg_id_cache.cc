/*
   Copyright (c) <2014> Verisign, Inc.

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights 
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
   copies of the Software, and to permit persons to whom the Software is furnished 
   to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in all 
   copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
   INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
   PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
   HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION 
   OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE 
   SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


#include <stdio.h>

#include "smg_id_cache.h"
#include "smg_id.h"

using namespace std;

SmgIdCache SmgIdCache::s_oInstance;

SmgIdCache::SmgIdCache()
{

}

SmgIdCache::~SmgIdCache()
{
  clear();
}

SmgIdCache &SmgIdCache::getInstance()
{
  return s_oInstance;
}

bool SmgIdCache::addID(SmgID &p_oID, SmgCryptAction_e p_eAction, time_t p_tTTL)
{
  bool bRet = false;

  if (ACT_ENCR != p_eAction && ACT_SIGN != p_eAction)
  {
    smg_log("Unable to add ID with action value %d (not ACT_ENCR or ACT_SIGN)\n", (int) p_eAction);
  }
  else
  {
    SmgIdMap_t &oMap = (ACT_ENCR == p_eAction) ?  m_oEncMap : m_oSignMap;
    SmgIdMapIter_t tIter = oMap.find(p_oID.getInbox());
    if (oMap.end() != tIter)
    {
      delete tIter->second.m_pID;
    }
    SmgIdTtl_t tEntry;
    tEntry.m_tExpiration = (0 == p_tTTL) ? 0 : time(NULL) + p_tTTL;
    tEntry.m_pID = new SmgID();
    (*tEntry.m_pID) = p_oID;
    oMap[p_oID.getEmail()] = tEntry;

    bRet = true;
  }

  return bRet;
}

bool SmgIdCache::lookupSmimeID(std::string &p_sID, SmgCryptAction_e p_eAction, SmgID &p_oOutputID)
{
  bool bRet = false;

  if (ACT_ENCR != p_eAction && ACT_SIGN != p_eAction)
  {
    smg_log("Unable to lookup ID with action value %d (not ACT_ENCR or ACT_SIGN)\n", (int) p_eAction);
  }
  else
  {
    SmgIdMap_t &oMap = (ACT_ENCR == p_eAction) ?  m_oEncMap : m_oSignMap;

    SmgIdMapIter_t tIter = oMap.find(p_sID);
    if (oMap.end() != tIter)
    {
      SmgIdTtl_t tEntry = tIter->second;
      time_t tNow = time(NULL);
      if (0 < tEntry.m_tExpiration && tEntry.m_tExpiration < tNow)
      {
// smg_log("Deleting ID: %s\n", p_sID.c_str());
        delete tEntry.m_pID;
        oMap.erase(tIter);
      }
      else if (NULL == tEntry.m_pID)
      {
        smg_log("Cache ID map has a NULL pointer in ID: %s\n", p_sID.c_str());
      }
      else
      {
        p_oOutputID = *tEntry.m_pID;
        bRet = true;
      }
    }
  }

  return bRet;
}

bool SmgIdCache::clear()
{
  for (SmgIdMapIter_t tIter = m_oEncMap.begin();
       m_oEncMap.end() != tIter;
       tIter++)
  {
    delete tIter->second.m_pID;
  }
  m_oEncMap.clear();

  for (SmgIdMapIter_t tIter = m_oSignMap.begin();
       m_oSignMap.end() != tIter;
       tIter++)
  {
    delete tIter->second.m_pID;
  }
  m_oSignMap.clear();

  return true;
}

